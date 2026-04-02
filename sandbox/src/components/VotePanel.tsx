"use client";

import type { SandboxEvent } from "@/lib/types";

interface VotePanelProps {
  votes: Array<{ member: string; option: string; confidence: number; defected: boolean }>;
  verdict: (SandboxEvent & { event: "verdict" }) | null;
}

const MEMBER_COLORS: Record<string, string> = {
  RAZOR: "#FF0000",
  GHOST: "#7B68EE",
  SCOUT: "#00CC00",
  BISHOP: "#FFD700",
};

export function VotePanel({ votes, verdict }: VotePanelProps) {
  if (votes.length === 0 && !verdict) return null;

  // Tally votes by option
  const tally: Record<string, { count: number; totalConfidence: number; voters: string[] }> = {};
  for (const v of votes) {
    if (!tally[v.option]) {
      tally[v.option] = { count: 0, totalConfidence: 0, voters: [] };
    }
    tally[v.option].count++;
    tally[v.option].totalConfidence += v.confidence;
    tally[v.option].voters.push(v.member);
  }

  const maxVotes = Math.max(...Object.values(tally).map((t) => t.count), 1);

  return (
    <div
      style={{
        borderTop: "2px solid #333",
        padding: 12,
        fontFamily: "'Courier New', monospace",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: "bold",
          color: "#666",
          letterSpacing: 1,
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        {verdict ? "VERDICT" : "VOTES"}
      </div>

      {/* Vote bars */}
      {Object.entries(tally).map(([option, data]) => (
        <div key={option} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>
            {option}{" "}
            <span style={{ color: "#666" }}>
              ({data.count} vote{data.count !== 1 ? "s" : ""})
            </span>
          </div>
          <div
            style={{
              height: 20,
              background: "#1a1a2e",
              borderRadius: 4,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(data.count / maxVotes) * 100}%`,
                background:
                  verdict?.verdict.winningOption === option
                    ? "linear-gradient(90deg, #00aa44, #00ff66)"
                    : "linear-gradient(90deg, #444, #666)",
                borderRadius: 4,
                transition: "width 0.5s ease",
              }}
            />
            {/* Voter dots */}
            <div
              style={{
                position: "absolute",
                top: 2,
                left: 4,
                display: "flex",
                gap: 3,
              }}
            >
              {data.voters.map((v) => (
                <div
                  key={v}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: MEMBER_COLORS[v] ?? "#666",
                    border: "1px solid #000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 8,
                    fontWeight: "bold",
                  }}
                  title={v}
                >
                  {v[0]}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Defection warnings */}
      {votes
        .filter((v) => v.defected)
        .map((v) => (
          <div key={v.member} style={{ fontSize: 10, color: "#ff6600", marginTop: 4 }}>
            ⚠ {v.member} DEFECTED (confidence: {(v.confidence * 100).toFixed(0)}%)
          </div>
        ))}

      {/* Verdict */}
      {verdict && (
        <div
          style={{
            marginTop: 8,
            padding: 8,
            background: "#0a2a0a",
            borderRadius: 4,
            border: "1px solid #00ff66",
          }}
        >
          <div style={{ fontSize: 12, color: "#00ff66", fontWeight: "bold" }}>
            WINNER: {verdict.verdict.winningOption}
          </div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
            Confidence: {(verdict.verdict.confidence * 100).toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  );
}
