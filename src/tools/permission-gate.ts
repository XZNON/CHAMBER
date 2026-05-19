import type { ToolDefinition, PermissionLevel } from "./types.js";
import type { PermissionOverrideMap } from "./context.js";

export class PermissionGate {
  private overrides: PermissionOverrideMap;

  constructor(overrides?: PermissionOverrideMap) {
    this.overrides = overrides ?? new Map();
  }

  check(def: ToolDefinition): PermissionLevel {
    if (def.isReadOnly) return "auto";
    return this.overrides.get(def.name) ?? def.defaultPermission;
  }

  setOverride(toolName: string, level: PermissionLevel): void {
    this.overrides.set(toolName, level);
  }

  removeOverride(toolName: string): void {
    this.overrides.delete(toolName);
  }
}
