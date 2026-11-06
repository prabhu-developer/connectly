import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name must be at least 1 character")
    .max(50, "Display name cannot exceed 50 characters")
    .optional(),
  bio: z
    .string()
    .trim()
    .max(160, "Bio cannot exceed 160 characters")
    .optional(),
  avatarUrl: z
    .string()
    .trim()
    .max(1000, "Avatar URL cannot exceed 1000 characters")
    .optional()
    .nullable(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export interface UserProfileDto {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUserProfileDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  lastSeenAt?: string;
}
