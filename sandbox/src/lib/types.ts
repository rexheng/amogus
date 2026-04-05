// ─── Shared types between MCP server and sandbox UI ───

export type CouncilPhase =
  | "idle"
  | "recon"
  | "naive_plan"
  | "round_1"
  | "round_2"
  | "voting"
  | "verdict"
  | "synthesis"
  | "reaper";

export interface MemberInfo {
  id: string;
  name: string;
  color: string;
  archetype: string;
  accessory: string;
  generation: number;
  lineage: string[];
  stats: {
    wins: number;
    losses: number;
    defections: number;
    totalDecisions: number;
  };
}

export interface MemberPosition {
  memberId: string;
  memberName: string;
  frameworkAnswers: Record<string, string>;
  critique: string;
  revisedPlan: string;
  vote: string;
  confidence: number;
}

// ─── WebSocket events from MCP server ───

export type SandboxEvent =
  | { event: "state_sync"; phase: CouncilPhase; members: MemberInfo[]; historyCount: number }
  | { event: "meeting_called"; decision: string; timestamp: number }
  | { event: "recon_start"; searches: string[] }
  | { event: "recon_result"; query: string; source: string; icon: string; snippet: string; meta?: string }
  | { event: "recon_complete"; brief: string }
  | { event: "naive_plan"; plan: string }
  | { event: "round_1_start"; members: string[] }
  | { event: "round_1_position"; member: string; position: MemberPosition }
  | { event: "round_1_complete"; unanimous: boolean }
  | { event: "round_2_start" }
  | { event: "rebuttal"; from: string; to: string; text: string }
  | { event: "vote"; member: string; option: string; confidence: number; defected: boolean }
  | {
      event: "verdict";
      verdict: {
        winningOption: string;
        confidence: number;
        votes: Array<{ memberName: string; vote: string; confidence: number; weight: number }>;
        dissent: string[];
      };
    }
  | { event: "synthesis_complete"; finalPlan: string; dissent: string[] }
  | {
      event: "reaper";
      eliminated: { name: string; generation: number; winRate: number };
      newMember: { name: string; generation: number; lineage: string[] };
    }
  | { event: "phase_change"; phase: CouncilPhase }
  | { event: "error"; message: string };

// ─── Canvas rendering constants ───

export const CANVAS = {
  WIDTH: 1200,
  HEIGHT: 800,
  BG_COLOR: "#0f0f23",
} as const;

// ─── Map Zones ───

// Meeting table (center of the map)
export const TABLE = { x: 600, y: 400, rx: 160, ry: 80 };

// Seats around the table (where agents sit during debates)
export const TABLE_SEATS: Array<{ x: number; y: number }> = [
  { x: 440, y: 340 },
  { x: 760, y: 340 },
  { x: 440, y: 460 },
  { x: 760, y: 460 },
];

// Research stations (where agents go during recon) — 4 desks with computers
export const RESEARCH_STATIONS: Array<{ x: number; y: number; label: string }> = [
  { x: 120, y: 140, label: "WEB SEARCH" },
  { x: 350, y: 120, label: "DOCS" },
  { x: 850, y: 120, label: "BENCHMARKS" },
  { x: 1060, y: 140, label: "GITHUB" },
];

// Isolation pods (where agents go during Round 1 — can't see each other)
export const ISOLATION_PODS: Array<{ x: number; y: number }> = [
  { x: 140, y: 400 },
  { x: 1060, y: 400 },
  { x: 140, y: 620 },
  { x: 1060, y: 620 },
];

// Gallows area
export const GALLOWS = { x: 600, y: 700 };

// Spawn point (where new agents materialize)
export const SPAWN = { x: 600, y: 100 };

// Wandering waypoints (random positions agents visit when idle)
export const WANDER_POINTS: Array<{ x: number; y: number }> = [
  { x: 200, y: 300 }, { x: 400, y: 200 }, { x: 800, y: 200 },
  { x: 1000, y: 300 }, { x: 300, y: 550 }, { x: 900, y: 550 },
  { x: 500, y: 650 }, { x: 700, y: 650 }, { x: 600, y: 250 },
];
