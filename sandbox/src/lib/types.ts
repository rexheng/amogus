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

// ─── Character states for the canvas renderer ───

export type CrewmateState =
  | "idle" // Standing around the room
  | "walking" // Moving to a position
  | "speaking" // At the table, speech bubble active
  | "voting" // Casting a vote
  | "dead" // Being executed
  | "spawning"; // Newly created

export interface CrewmateVisual {
  id: string;
  name: string;
  color: string;
  accessory: string;
  generation: number;
  state: CrewmateState;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speechText: string;
  voteOption: string;
  confidence: number;
  opacity: number;
}

// ─── WebSocket events from MCP server ───

export type SandboxEvent =
  | { event: "state_sync"; phase: CouncilPhase; members: MemberInfo[]; historyCount: number }
  | { event: "meeting_called"; decision: string; timestamp: number }
  | { event: "recon_start"; searches: string[] }
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
  BG_COLOR: "#1a1a2e",
  TABLE_COLOR: "#cc3333",
  TABLE_X: 600,
  TABLE_Y: 350,
  TABLE_RX: 200,
  TABLE_RY: 100,
  GALLOWS_X: 150,
  GALLOWS_Y: 650,
  LEADERBOARD_X: 950,
  LEADERBOARD_Y: 500,
} as const;

// Seat positions around the oval table
export const SEAT_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 400, y: 260 }, // top-left
  { x: 800, y: 260 }, // top-right
  { x: 400, y: 440 }, // bottom-left
  { x: 800, y: 440 }, // bottom-right
];
