import { Router, type IRouter } from "express";
import { getHealth } from "../controllers/health.controller.js";

export const healthRouter: IRouter = Router();

healthRouter.get("/", getHealth);

