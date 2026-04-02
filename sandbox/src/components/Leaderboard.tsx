"use client";

import type { MemberInfo } from "@/lib/types";

interface LeaderboardProps {
  members: MemberInfo[];
}

export function Leaderboard({ members }: LeaderboardProps) {
  const sorted = [...members].sort((a, b) => {
    const aRate = a.stats.totalDecisions > 0 ? a.stats.wins / a.stats.totalDecisions : 0.5;
    const bRate = b.stats.totalDecisions > 0 ? b.stats.wins / b.stats.totalDecisions : 0.5;
    return bRate - aRate;
  });

  return (
    <div
      style={{
        flex: 1,
        padding: 12,
        fontFamily: "'Courier New', monospace",
        borderLeft: "1px solid #333",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: "bold",
          color: "#666",
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        LEADERBOARD
      </div>

      {sorted.map((member, i) => {
        const winRate =
          member.stats.totalDecisions > 0
            ? ((member.stats.wins / member.stats.totalDecisions) * 100).toFixed(0)
            : "—";

        return (
          <div
            key={member.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
              fontSize: 11,
            }}
          >
            {/* Rank */}
            <span style={{ color: "#444", width: 16 }}>{i + 1}.</span>

            {/* Color dot */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: member.color,
                flexShrink: 0,
              }}
            />

            {/* Name + gen */}
            <span style={{ color: "#ccc", flex: 1 }}>
              {member.name}-v{member.generation}
            </span>

            {/* Record */}
            <span style={{ color: "#888" }}>
              {member.stats.wins}W-{member.stats.losses}L
            </span>

            {/* Win rate */}
            <span
              style={{
                color:
                  winRate === "—"
                    ? "#444"
                    : parseInt(winRate) >= 60
                      ? "#00ff66"
                      : parseInt(winRate) < 30
                        ? "#ff3333"
                        : "#ffaa00",
                width: 36,
                textAlign: "right",
              }}
            >
              {winRate === "—" ? "—" : `${winRate}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
