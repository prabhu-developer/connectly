import { Router, type IRouter } from "express";
import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";
import { presenceRouter } from "./presence.routes.js";

export const apiRouter: IRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/presence", presenceRouter);


