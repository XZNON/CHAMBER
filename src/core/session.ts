/**
 * Session History Manager
 *
 * CONTEXT ENGINEERING CONCEPT: Multi-Turn Session
 *
 * LLMs are stateless — they have zero memory between API calls.
 * To create the ILLUSION of an ongoing Session, we must
 * resend the ENTIRE Session history with every request.
 *
 * This means:
 *   - Every previous user message is included
 *   - Every previous assistant response is included
 *   - The context grows by ~2 messages per turn
 *   - Eventually, the context window will fill up
 *
 * This module manages that growing history. In Part 10, we will
 * add compression to handle the case when history exceeds the budget.
 * For now, we simply maintain and return the full history.
 *
 * CONCEPT: Memory Is Just Resending
 *
 * There is no magic to LLM "memory." When the model appears to
 * remember what you said 5 turns ago, it's because we literally
 * included that message in the current request. If we omit it,
 * the model has no idea it ever happened.
 */

import { MessageBuilder, getMessageText, type Message } from "./messages.js";
import { estimateTokens, calculateBudget } from "./tokens.js";
import {
  SessionManager,
  generateSessionId,
  type SavedSession,
} from "./history.js";
import { Conversation } from "openai/resources/conversations.mjs";

export interface SessionStats {
  id: string;
  name: string;
  messageCount: number;
  turnCount: number;
  estimatedTokens: number;
  createdAt: string;
  budgetWarning: "ok" | "caution" | "critical";
}

const BUDGET_CAUTION = 0.6;
const BUDGET_CRITICAL = 0.8;

export class Session {
  private messages: Message[] = [];
  private id: string;
  private name?: string;
  private createdAt: string;
  private model: string;
  private systemPrompt: string;

  constructor(model: string, systemPrompt: string, id?: string, name?: string) {
    this.id = id ?? generateSessionId();
    this.createdAt = new Date().toISOString();
    this.model = model;
    this.systemPrompt = systemPrompt;
    this.name = name;
  } //name issue

  rename(name: string): void {
    this.name = name;
  } //save name to the file also? fix

  getId(): string {
    return this.id;
  }

  addUserMessage(text: string): void {
    this.messages.push(MessageBuilder.user(text));
  }

  addAssistantMessage(text: string): void {
    this.messages.push(MessageBuilder.assistant(text));
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  getStats(): SessionStats {
    const estimatedTokens = this.messages.reduce((total, msg) => {
      const text = getMessageText(msg);
      return total + estimateTokens(text);
    }, 0);

    const budget = calculateBudget();
    const systemTokens = estimateTokens(this.systemPrompt);
    const totalUsed = systemTokens + estimatedTokens;
    const ratio = totalUsed / budget.availableForInput;

    let budgetWarning: "ok" | "caution" | "critical" = "ok";
    if (ratio >= BUDGET_CRITICAL) budgetWarning = "critical";
    else if (ratio >= BUDGET_CAUTION) budgetWarning = "caution";

    return {
      id: this.id,
      createdAt: this.createdAt,
      budgetWarning,
      messageCount: this.messages.length,
      turnCount: Math.floor(this.messages.length / 2),
      estimatedTokens,
      name: this.name ?? "(No name)",
    };
  }

  getRecentMessages(count: number): Message[] {
    return this.messages.slice(-count);
  }

  clear(): void {
    this.messages = [];
  }

  isEmpty(): boolean {
    return this.messages.length === 0;
  }

  // ===============================================
  // Persistance
  // ===============================================

  save(sessionManager: SessionManager): void {
    const data: SavedSession = {
      id: this.id,
      summary: "(not yet implemented)", // later use
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString(),
      model: this.model,
      turnCount: Math.floor(this.messages.length / 2),
      systemPrompt: this.systemPrompt,
      messages: this.messages,
    };
    sessionManager.save(data);
  }

  static fromSaved(saved: SavedSession): Session {
    const conv = new Session(saved.model, saved.systemPrompt, saved.id);
    conv.createdAt = saved.createdAt;
    conv.messages = [...saved.messages];
    return conv;
  }
}
