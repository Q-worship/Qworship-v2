import { Router } from "express";
import { chatController } from "./chat.controller.js";
import express from "express";

export const chatRouter = Router();

// Health Check
chatRouter.get("/health", chatController.healthCheck);

// FAQ AI Resolver
chatRouter.post("/faq-resolve", chatController.resolveFaq);

// Chat Sessions
chatRouter.post("/sessions", chatController.createSession);
chatRouter.get("/sessions/:sessionId/messages", chatController.getMessages);
chatRouter.post("/sessions/:sessionId/messages", chatController.sendMessage);
chatRouter.get("/sessions/:sessionId/events", chatController.subscribeToEvents);
chatRouter.post("/sessions/:sessionId/agent-reply", chatController.agentReply);

export const webhookRouter = Router();
// Webhooks need the raw body for signature verification
webhookRouter.use(express.json({
  verify: (req, res, buf) => {
    (req as any).rawBody = buf.toString();
  }
}));

webhookRouter.get("/whatsapp", chatController.verifyWebhook);
webhookRouter.post("/whatsapp", chatController.receiveWebhook);
