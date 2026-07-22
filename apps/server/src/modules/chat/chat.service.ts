import OpenAI from "openai";
import crypto from "crypto";
import { faqItems, pricingFaqTeaserItems } from "./chat.faq.js";

// Combine the FAQs just like the old chatbot matcher did
export const getChatbotFaqPool = () => {
  const seen = new Set<string>();
  const pool = [];
  for (const item of [...faqItems, ...pricingFaqTeaserItems]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      pool.push(item);
    }
  }
  return pool;
};

export type FaqResolveResult =
  | { type: "faq"; faqId: string; answer: string }
  | { type: "handoff" };

const MIN_CONFIDENCE = 0.7;

export class ChatService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Resolves a user query to an FAQ using OpenAI
   */
  async resolveFaqWithAi(query: string): Promise<FaqResolveResult> {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY is not set. Defaulting to handoff.");
      return { type: "handoff" };
    }

    const pool = getChatbotFaqPool();
    const faqList = pool.map((faq) => `${faq.id} | ${faq.question}`).join("\n");

    const systemPrompt = [
      "You are a FAQ router for Q-worship church presentation software.",
      'Return ONLY valid JSON with this shape: {"faqId":"faq-id-or-null","confidence":0.0-1.0}.',
      "Pick faqId only when the user question is clearly answered by that FAQ.",
      'Return {"faqId":null,"confidence":0} when off-topic, unsure, or no FAQ fits.',
      "Never invent faq ids. Never write an answer — only select an id.",
    ].join(" ");

    const userPrompt = `FAQ list:\n${faqList}\n\nUser question: ${query}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Cost-effective model for routing
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      });

      const responseText = response.choices[0]?.message?.content || "";
      
      let selection: { faqId: string | null; confidence: number } | null = null;
      try {
        const parsed = JSON.parse(responseText);
        selection = {
          faqId: typeof parsed.faqId === "string" ? parsed.faqId : null,
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
        };
      } catch (e) {
        // Failed to parse JSON
      }

      if (!selection || !selection.faqId || selection.confidence < MIN_CONFIDENCE) {
        return { type: "handoff" };
      }

      const faq = pool.find((item) => item.id === selection.faqId);
      if (!faq) {
        return { type: "handoff" };
      }

      return { type: "faq", faqId: faq.id, answer: faq.answer };
    } catch (error) {
      console.error("OpenAI FAQ Resolution Error:", error);
      return { type: "handoff" };
    }
  }

  /**
   * Validates if WhatsApp integration variables are configured
   */
  isWhatsAppConfigured(): boolean {
    return Boolean(
      process.env.WHATSAPP_TOKEN &&
        process.env.WHATSAPP_PHONE_NUMBER_ID &&
        process.env.WHATSAPP_AGENT_PHONE
    );
  }

  /**
   * Sends a message to a WhatsApp number via Meta Graph API
   */
  async sendWhatsAppText(to: string, body: string): Promise<boolean> {
    if (!this.isWhatsAppConfigured()) {
      return false;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: this.normalizePhone(to),
            type: "text",
            text: { body },
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error("WhatsApp API Error:", error);
      return false;
    }
  }

  /**
   * Strips non-digit characters from a phone number
   */
  normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
  }

  /**
   * Verifies the SHA-256 HMAC signature of a Meta Webhook payload
   */
  verifyWebhookSignature(payload: string, signatureHeader: string | null): boolean {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret || !signatureHeader?.startsWith("sha256=")) {
      return !appSecret;
    }

    const expected = signatureHeader.slice("sha256=".length);
    const hmac = crypto.createHmac("sha256", appSecret);
    hmac.update(payload);
    const calculated = hmac.digest("hex");

    return crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(expected));
  }

  /**
   * Formats the notification sent to the human agent on WhatsApp
   */
  buildAgentNotification(
    sessionId: string,
    email: string | null,
    text: string,
    isInitial = false
  ): string {
    const header = isInitial
      ? "New Q-worship support request"
      : "Q-worship visitor message";
    const lines = [
      header,
      `Session: ${sessionId}`,
      email ? `Email: ${email}` : null,
      "",
      text,
      "",
      `Reply with: /reply ${sessionId} your message`,
    ].filter((line) => line !== null);

    return lines.join("\n");
  }

  /**
   * Parses the agent's reply from the WhatsApp message
   */
  parseAgentReply(body: string): { sessionId: string; text: string } | null {
    const match = body.match(/^\/reply\s+([a-zA-Z0-9-]+)\s+([\s\S]+)$/i);
    if (!match) return null;
    return { sessionId: match[1], text: match[2].trim() };
  }
}

export const chatService = new ChatService();
