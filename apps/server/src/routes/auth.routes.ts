import { Router, type IRouter } from "express";
import {
  handleRegister,
  handleLogin,
  handleRefresh,
  handleLogout,
  handleGetMe,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const authRouter: IRouter = Router();

authRouter.post("/register", handleRegister);
authRouter.post("/login", handleLogin);
authRouter.post("/refresh", handleRefresh);
authRouter.post("/logout", handleLogout);
authRouter.get("/me", requireAuth, handleGetMe);

