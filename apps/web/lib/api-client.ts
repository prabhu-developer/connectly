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

// Request interceptor: attach bearer token
apiClient.interceptors.request.use((config) => {
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
      isRefreshing = true;

      try {
        const { data } = await apiClient.post<ApiResponse<AuthResponseData>>(
          "/auth/refresh"
        );

        if (data.success) {
          const newToken = data.data.accessToken;
          setAccessToken(newToken);
          processQueue(null, newToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        }

        throw new Error("Refresh failed");
      } catch (refreshErr) {
        setAccessToken(null);
        processQueue(refreshErr, null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

