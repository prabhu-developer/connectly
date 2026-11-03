import { Router, type IRouter } from "express";
import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";

export const apiRouter: IRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);


