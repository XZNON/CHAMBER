import type { ToolDefinition } from "./types.js";

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(def: ToolDefinition): void {
    if (this.tools.has(def.name)) {
      throw new Error(`Tool "${def.name}" is already registered`);
    }
    this.tools.set(def.name, def);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  size(): number {
    return this.tools.size;
  }
}
