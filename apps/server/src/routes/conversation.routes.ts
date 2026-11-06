import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getConversations,
  createConversation,
  getConversation,
  getMessages,
  sendMessage,
  updateReadCursor,
  searchMessages,
  deleteConversation,
  deleteMessage,
} from "../controllers/conversation.controller.js";

export const conversationRouter: IRouter = Router();

// Protect all conversation routes
conversationRouter.use(requireAuth);

conversationRouter.get("/", getConversations);
conversationRouter.post("/", createConversation);
conversationRouter.get("/:id", getConversation);
conversationRouter.delete("/:id", deleteConversation);
conversationRouter.get("/:id/messages", getMessages);
conversationRouter.get("/:id/messages/search", searchMessages);
conversationRouter.post("/:id/messages", sendMessage);
conversationRouter.delete("/:id/messages/:messageId", deleteMessage);
conversationRouter.post("/:id/read", updateReadCursor);
