import type { Request, Response, NextFunction } from "express";
import {
  createConversationSchema,
  sendMessageSchema,
  messageQuerySchema,
  updateReadCursorSchema,
  searchMessagesQuerySchema,
} from "@repo/contracts/chat";
import { conversationService } from "../services/conversation.service.js";
import { messageService } from "../services/message.service.js";
import { readCursorService } from "../services/read-cursor.service.js";
import { AppError } from "../middleware/error.middleware.js";

function getParamId(param: string | string[] | undefined, name: string): string {
  const id = Array.isArray(param) ? param[0] : param;
  if (!id) {
    throw new AppError(`${name} is required`, 400, "MISSING_PARAM");
  }
  return id;
}

export async function getConversations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const conversations = await conversationService.getUserConversations(userId);

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (err) {
    next(err);
  }
}

export async function createConversation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = createConversationSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        parseResult.error.errors[0]?.message || "Invalid conversation payload",
        400,
        "VALIDATION_ERROR"
      );
    }

    const userId = req.user!.id;
    const conversation = await conversationService.findOrCreateConversation(
      userId,
      parseResult.data.recipientId
    );

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (err) {
    next(err);
  }
}

export async function getConversation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const conversationId = getParamId(req.params.id, "Conversation ID");
    const userId = req.user!.id;

    const conversation = await conversationService.getConversationById(
      conversationId,
      userId
    );

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const conversationId = getParamId(req.params.id, "Conversation ID");
    const userId = req.user!.id;

    const parseResult = messageQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new AppError(
        parseResult.error.errors[0]?.message || "Invalid query parameters",
        400,
        "VALIDATION_ERROR"
      );
    }

    const { cursor, limit } = parseResult.data;
    const paginated = await messageService.getConversationMessages({
      conversationId,
      currentUserId: userId,
      cursor,
      limit,
    });

    res.status(200).json({
      success: true,
      data: paginated,
    });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const conversationId = getParamId(req.params.id, "Conversation ID");
    const userId = req.user!.id;

    const parseResult = sendMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        parseResult.error.errors[0]?.message || "Invalid message payload",
        400,
        "VALIDATION_ERROR"
      );
    }

    const message = await messageService.createMessage({
      conversationId,
      senderId: userId,
      content: parseResult.data.content,
      attachment: parseResult.data.attachment,
      clientTempId: parseResult.data.clientTempId,
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateReadCursor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const conversationId = getParamId(req.params.id, "Conversation ID");
    const userId = req.user!.id;

    const parseResult = updateReadCursorSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        parseResult.error.errors[0]?.message || "Invalid read cursor payload",
        400,
        "VALIDATION_ERROR"
      );
    }

    const result = await readCursorService.updateReadCursor(
      conversationId,
      userId,
      parseResult.data.messageId
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function searchMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const conversationId = getParamId(req.params.id, "Conversation ID");
    const userId = req.user!.id;

    const parseResult = searchMessagesQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new AppError(
        parseResult.error.errors[0]?.message || "Invalid search query",
        400,
        "VALIDATION_ERROR"
      );
    }

    const { q, limit } = parseResult.data;
    const results = await messageService.searchMessages({
      currentUserId: userId,
      conversationId,
      query: q,
      limit,
    });

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    next(err);
  }
}
