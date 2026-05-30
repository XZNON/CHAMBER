// Reserved for Part 11+ (Memory, Planning, Sub-Agents)
//
// Dynamic agent state — things that change while the agent runs.
// Infrastructure (provider, toolRegistry, config) does not belong here.
//
// Expected shape when needed:
//
// interface ChamberState {
//   conversation: AgentMessage[]
//   tokenUsage: SessionUsage
//   iteration: number
//   toolCallsExecuted: number
//   currentTask?: string
//   plan?: Plan
//   scratchpad: string[]
// }

export {};
