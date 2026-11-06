import { apiClient, setAccessToken, requestRefreshToken } from "../../../lib/api-client";
import type { ApiResponse } from "@repo/contracts/api";
import type {
  RegisterInput,
  LoginInput,
  AuthResponseData,
  AuthUserDto,
} from "@repo/contracts/auth";

export const authApi = {
  async register(input: RegisterInput): Promise<AuthResponseData> {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>(
      "/auth/register",
      input
    );
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    setAccessToken(res.data.data.accessToken);
    return res.data.data;
  },

  async login(input: LoginInput): Promise<AuthResponseData> {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>(
      "/auth/login",
      input
    );
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    setAccessToken(res.data.data.accessToken);
    return res.data.data;
  },

  async refresh(): Promise<AuthResponseData> {
    return requestRefreshToken();
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post<ApiResponse<{ message: string }>>("/auth/logout");
    } finally {
      setAccessToken(null);
    }
  },

  async getMe(): Promise<AuthUserDto> {
    const res = await apiClient.get<ApiResponse<AuthUserDto>>("/auth/me");
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  },
};
