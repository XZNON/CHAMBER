/**
 * Session storage
 *
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { type AgentMessage } from "./agent-message.js";
import { fileURLToPath } from "node:url";

// Types

export interface SavedSession {
  id: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  model: string;
  turnCount: number;
  systemPrompt: string;
  messages: AgentMessage[]; // if the messages are too big we cant store all the messages?
  summary: string; // in future also save the summary of a session for better understanding, (use a memory layer to better store summary)
}

export interface SessionSummary {
  id: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
  preview: string;
}

export class SessionManager {
  private storageDir: string;

  constructor(storageDir?: string) {
    this.storageDir =
      storageDir ?? path.join(process.cwd(), "data", "sessions");
    this.ensureDirectory();
  }

  save(session: SavedSession): void {
    const filePath = this.getFilePath(session.id);
    const json = JSON.stringify(session, null, 2);
    fs.writeFileSync(filePath, json, "utf-8");
  }

  load(id: string): SavedSession | null {
    //can we get the session using name of the session? (add if not)
    const filePath = this.getFilePath(id);
    if (!fs.existsSync(filePath)) {
      console.log("Session does not exist");
      return null;
    }

    try {
      const json = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(json) as SavedSession;
    } catch {
      return null;
    }
  }

  list(): SessionSummary[] {
    if (!fs.existsSync(this.storageDir)) {
      return [];
    }

    const files = fs
      .readdirSync(this.storageDir)
      .filter((f) => f.endsWith(".json"));

    const summaries: SessionSummary[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(this.storageDir, file);
        const json = fs.readFileSync(filePath, "utf-8");
        const session = JSON.parse(json) as SavedSession;

        let preview = "(empty Session)";
        const firstUserMessage = session.messages.find(
          (m) => m.role === "user",
        );
        if (firstUserMessage && firstUserMessage.role === "user") {
          const text = firstUserMessage.content;
          preview = text.length > 60 ? text.slice(0, 60) + "..." : text;
        }

        summaries.push({
          id: session.id,
          name: session.name,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          turnCount: session.turnCount,
          preview,
        });
      } catch {
        //skip
      }
    }

    summaries.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    return summaries;
  }

  delete(id: string): boolean {
    const filePath = this.getFilePath(id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  getStorageDir(): string {
    return this.storageDir;
  }

  private getFilePath(id: string) {
    return path.join(this.storageDir, `${id}.json`);
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }
}

export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `conv-${timestamp}-${random}`;
}
