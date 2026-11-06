import axios, { type AxiosRequestConfig, type AxiosError } from "axios";
import type { ApiResponse } from "@repo/contracts/api";
import type { AuthResponseData } from "@repo/contracts/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "/api" : process.env.API_URL || "http://localhost:5000/api");

// In-memory access token storage
let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  currentAccessToken = token;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send and receive HTTP-only cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach bearer token (awaiting active refresh if in flight)
apiClient.interceptors.request.use(async (config) => {
  // If not an auth handshake endpoint and a token refresh is in progress, await it
  if (
    activeRefreshPromise &&
    !config.url?.includes("/auth/refresh") &&
    !config.url?.includes("/auth/login") &&
    !config.url?.includes("/auth/register")
  ) {
    try {
      const refreshed = await activeRefreshPromise;
      if (refreshed?.accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${refreshed.accessToken}`;
      }
      return config;
    } catch {
      // Refresh failed, continue and allow response handler to catch
    }
  }

  if (currentAccessToken && config.headers) {
    config.headers.Authorization = `Bearer ${currentAccessToken}`;
  }
  return config;
});

// Response interceptor: auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

let activeRefreshPromise: Promise<AuthResponseData> | null = null;

/**
 * Deduplicated token refresh request.
 * Multiple concurrent callers share a single in-flight HTTP request to /auth/refresh,
 * preventing duplicate refresh token rotation race conditions (e.g. on page refresh in React StrictMode).
 */
export async function requestRefreshToken(): Promise<AuthResponseData> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  isRefreshing = true;

  activeRefreshPromise = (async () => {
    try {
      const res = await apiClient.post<ApiResponse<AuthResponseData>>("/auth/refresh");
      if (!res.data.success) {
        throw new Error(res.data.error.message || "Failed to refresh session");
      }
      setAccessToken(res.data.data.accessToken);
      processQueue(null, res.data.data.accessToken);
      return res.data.data;
    } catch (err) {
      setAccessToken(null);
      processQueue(err, null);
      throw err;
    } finally {
      activeRefreshPromise = null;
      isRefreshing = false;
    }
  })();

  return activeRefreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retried, and not the refresh/login endpoint itself
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;

      try {
        const data = await requestRefreshToken();
        const newToken = data.accessToken;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        setAccessToken(null);
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

