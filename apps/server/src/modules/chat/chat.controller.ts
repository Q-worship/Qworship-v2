import { Request, Response } from "express";
import { ChatSession } from "./chat.model.js";
import { chatService } from "./chat.service.js";

// Keep track of active SSE connections for real-time updates
const activeConnections = new Map<string, Response>();

export const chatController = {
  /**
   * Health check for chat module
   */
  healthCheck: async (req: Request, res: Response) => {
    res.json({ ok: true });
  },

  /**
   * Resolve an FAQ query using OpenAI directly
   */
  resolveFaq: async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      if (!query?.trim()) {
        return res.status(400).json({ error: "query is required" });
      }

      const result = await chatService.resolveFaqWithAi(query.trim());
      res.json(result);
    } catch (error) {
      console.error("resolveFaq error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  /**
   * Initialize a new chat session
   */
  createSession: async (req: Request, res: Response) => {
    try {
      const { email, query } = req.body;
      if (!query?.trim()) {
        return res.status(400).json({ error: "query is required" });
      }

      // Create session in DB
      const session = await ChatSession.create({
        email: email?.trim() || null,
        messages: [{ role: "visitor", text: query.trim() }],
      });

      // Send WhatsApp notification if configured
      if (chatService.isWhatsAppConfigured()) {
        await chatService.sendWhatsAppText(
          process.env.WHATSAPP_AGENT_PHONE!,
          chatService.buildAgentNotification(
            session.sessionId,
            session.email || null,
            query.trim(),
            true
          )
        );
      }

      res.status(201).json({ sessionId: session.sessionId });
    } catch (error) {
      console.error("createSession error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  /**
   * Get all messages for a session
   */
  getMessages: async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = await ChatSession.findOne({ sessionId });

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json(session.messages);
    } catch (error) {
      console.error("getMessages error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  /**
   * Subscribe to new messages via Server-Sent Events (SSE)
   */
  subscribeToEvents: async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Send initial connected event
    res.write("data: connected\n\n");

    // Save connection to notify later
    activeConnections.set(sessionId, res);

    req.on("close", () => {
      activeConnections.delete(sessionId);
    });
  },

  /**
   * Send a message from the visitor
   */
  sendMessage: async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { text } = req.body;

      if (!text?.trim()) {
        return res.status(400).json({ error: "text is required" });
      }

      const session = await ChatSession.findOne({ sessionId });
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const message = { role: "visitor" as const, text: text.trim(), timestamp: new Date() };
      session.messages.push(message);
      await session.save();

      // Send WhatsApp notification
      if (chatService.isWhatsAppConfigured()) {
        await chatService.sendWhatsAppText(
          process.env.WHATSAPP_AGENT_PHONE!,
          chatService.buildAgentNotification(
            sessionId,
            session.email || null,
            text.trim()
          )
        );
      }

      res.json({ message });
    } catch (error) {
      console.error("sendMessage error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  /**
   * Send a message from the agent (usually via admin dashboard or API)
   */
  agentReply: async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { text } = req.body;
      const auth = req.headers.authorization;
      const apiKey = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

      if (!process.env.AGENT_API_KEY || apiKey !== process.env.AGENT_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!text?.trim()) {
        return res.status(400).json({ error: "text is required" });
      }

      const session = await ChatSession.findOne({ sessionId });
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const message = { role: "agent" as const, text: text.trim(), timestamp: new Date() };
      session.messages.push(message);
      await session.save();

      // Notify connected client via SSE
      const clientRes = activeConnections.get(sessionId);
      if (clientRes) {
        clientRes.write(`data: ${JSON.stringify(message)}\n\n`);
      }

      res.json({ message });
    } catch (error) {
      console.error("agentReply error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  /**
   * WhatsApp Webhook Verification
   */
  verifyWebhook: (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
      return res.status(200).send(challenge);
    }
    res.status(403).send("Forbidden");
  },

  /**
   * Handle incoming WhatsApp Messages
   */
  receiveWebhook: async (req: Request, res: Response) => {
    try {
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const signature = req.headers["x-hub-signature-256"] as string;

      const valid = chatService.verifyWebhookSignature(rawBody, signature);
      if (!valid) {
        return res.status(401).send("Invalid signature");
      }

      const payload = req.body;

      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          for (const message of change.value?.messages ?? []) {
            if (message.type !== "text" || !message.text?.body) continue;

            const agentPhone = chatService.normalizePhone(process.env.WHATSAPP_AGENT_PHONE ?? "");
            if (chatService.normalizePhone(message.from) !== agentPhone) continue;

            const parsed = chatService.parseAgentReply(message.text.body);
            if (!parsed) continue;

            const session = await ChatSession.findOne({ sessionId: parsed.sessionId });
            if (!session) continue;

            const agentMessage = {
              role: "agent" as const,
              text: parsed.text,
              timestamp: new Date(),
            };
            session.messages.push(agentMessage);
            await session.save();

            // Notify connected client via SSE
            const clientRes = activeConnections.get(parsed.sessionId);
            if (clientRes) {
              clientRes.write(`data: ${JSON.stringify(agentMessage)}\n\n`);
            }
          }
        }
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook receive error:", error);
      res.status(500).send("Internal error");
    }
  },
};
