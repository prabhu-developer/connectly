import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getConversations,
  createConversation,
  getConversation,
  getMessages,
  sendMessage,
  updateReadCursor,
} from "../controllers/conversation.controller.js";

export const conversationRouter: IRouter = Router();

// Protect all conversation routes
conversationRouter.use(requireAuth);

conversationRouter.get("/", getConversations);
conversationRouter.post("/", createConversation);
conversationRouter.get("/:id", getConversation);
conversationRouter.get("/:id/messages", getMessages);
conversationRouter.post("/:id/messages", sendMessage);
conversationRouter.post("/:id/read", updateReadCursor);
