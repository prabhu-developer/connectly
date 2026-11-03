import { Router, type IRouter } from "express";
import { healthRouter } from "./health.routes.js";

export const apiRouter: IRouter = Router();

apiRouter.use("/health", healthRouter);

