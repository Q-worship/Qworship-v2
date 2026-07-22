import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface IChatMessage {
  role: "visitor" | "agent";
  text: string;
  timestamp: Date;
}

export interface IChatSession extends Document {
  sessionId: string;
  email?: string;
  messages: IChatMessage[];
  status: "active" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, enum: ["visitor", "agent"], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ChatSessionSchema = new Schema<IChatSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    email: { type: String, trim: true },
    messages: { type: [ChatMessageSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

export const ChatSession = mongoose.model<IChatSession>(
  "ChatSession",
  ChatSessionSchema,
);
