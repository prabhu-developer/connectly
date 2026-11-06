import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  searchUsers,
  getProfile,
  updateProfile,
  getSettings,
  updateSettings,
  getUserById,
} from "../controllers/user.controller.js";

export const userRouter: IRouter = Router();

userRouter.use(requireAuth);

userRouter.get("/search", searchUsers);
userRouter.get("/profile", getProfile);
userRouter.patch("/profile", updateProfile);
userRouter.get("/settings", getSettings);
userRouter.patch("/settings", updateSettings);
userRouter.get("/:id", getUserById);
