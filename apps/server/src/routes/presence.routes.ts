import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getUserPresence, getBatchPresence } from "../controllers/presence.controller.js";

export const presenceRouter: IRouter = Router();

// Apply auth middleware to all presence routes
presenceRouter.use(requireAuth);

presenceRouter.get("/", getBatchPresence);
presenceRouter.get("/:userId", getUserPresence);
