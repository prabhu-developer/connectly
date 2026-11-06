import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { searchUsers } from "../controllers/user.controller.js";

export const userRouter: IRouter = Router();

userRouter.use(requireAuth);

userRouter.get("/search", searchUsers);
