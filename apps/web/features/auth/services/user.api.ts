import { apiClient } from "../../../lib/api-client";
import type { ApiResponse } from "@repo/contracts/api";
import type {
  UpdateProfileInput,
  UpdateSettingsInput,
  UserProfileDto,
  PublicUserProfileDto,
  UserSettingsDto,
} from "@repo/contracts/user";

export const userApi = {
  async getProfile(): Promise<UserProfileDto> {
    const res = await apiClient.get<ApiResponse<UserProfileDto>>("/users/profile");
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  },

  async updateProfile(data: UpdateProfileInput): Promise<UserProfileDto> {
    const res = await apiClient.patch<ApiResponse<UserProfileDto>>("/users/profile", data);
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  },

  async getSettings(): Promise<UserSettingsDto> {
    const res = await apiClient.get<ApiResponse<UserSettingsDto>>("/users/settings");
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  },

  async updateSettings(data: UpdateSettingsInput): Promise<UserSettingsDto> {
    const res = await apiClient.patch<ApiResponse<UserSettingsDto>>("/users/settings", data);
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  },

  async getUserById(id: string): Promise<PublicUserProfileDto> {
    const res = await apiClient.get<ApiResponse<PublicUserProfileDto>>(`/users/${id}`);
    if (!res.data.success) {
      throw new Error(res.data.error.message);
    }
    return res.data.data;
  },
};
