import { Router, type IRouter } from "express";
import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";
import { presenceRouter } from "./presence.routes.js";
import { conversationRouter } from "./conversation.routes.js";
import { userRouter } from "./user.routes.js";
import { mediaRouter } from "./media.routes.js";

export const apiRouter: IRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/presence", presenceRouter);
apiRouter.use("/conversations", conversationRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/media", mediaRouter);


