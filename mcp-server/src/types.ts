// ─── Council Member Types ───

export type MemberArchetype = "shipper" | "paranoid" | "researcher" | "architect";

export interface MemberDefinition {
  name: string;
  archetype: MemberArchetype;
  color: string; // hex color for Among Us crewmate
  accessory: string; // visual identifier
  systemPrompt: string;
  frameworkQuestions: string[];
}

export interface MemberState {
  id: string;
  definition: MemberDefinition;
  generation: number; // v1, v2, v3...
  lineage: string[]; // e.g. ["GHOST-v1", "GHOST-v2 + SCOUT traits"]
  stats: MemberStats;
}

export interface MemberStats {
  wins: number;
  losses: number;
  defections: number;
  totalDecisions: number;
  overrideMatches: number;
}

// ─── Deliberation Types ───

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

export interface CouncilRequest {
  prompt: string;
  context?: string;
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

export interface MemberChallenge {
  memberId: string;
  memberName: string;
  challengeTarget: string;
  challenge: string;
  finalVote: string;
  previousVote: string;
  defected: boolean;
  confidence: number;
}

export interface Verdict {
  winningOption: string;
  confidence: number;
  votes: Array<{
    memberName: string;
    vote: string;
    confidence: number;
    weight: number;
  }>;
  dissent: string[];
}

export interface DecisionRecord {
  id: string;
  timestamp: number;
  prompt: string;
  naivePlan: string;
  positions: MemberPosition[];
  challenges: MemberChallenge[];
  verdict: Verdict;
  finalPlan: string;
  overriddenTo?: string;
}

// ─── WebSocket Event Types ───

export type SandboxEvent =
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
  | { event: "verdict"; verdict: Verdict }
  | { event: "synthesis_complete"; finalPlan: string; dissent: string[] }
  | {
      event: "reaper";
      eliminated: { name: string; generation: number; winRate: number };
      newMember: { name: string; generation: number; lineage: string[] };
    }
  | { event: "phase_change"; phase: CouncilPhase }
  | { event: "error"; message: string };

// ─── Recon Types ───

export interface ReconResult {
  query: string;
  snippets: string[];
}

export interface ContextBrief {
  searches: ReconResult[];
  summary: string;
}
