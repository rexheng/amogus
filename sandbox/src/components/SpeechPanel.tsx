"use client";

import type { CouncilPhase, MemberPosition } from "@/lib/types";

interface SpeechPanelProps {
  phase: CouncilPhase;
  decision: string;
  naivePlan: string;
  positions: Map<string, MemberPosition>;
  rebuttals: Array<{ from: string; to: string; text: string }>;
  searchQueries: string[];
  contextBrief: string;
  finalPlan: string;
}

const MEMBER_COLORS: Record<string, string> = {
  RAZOR: "#FF0000",
  GHOST: "#7B68EE",
  SCOUT: "#00CC00",
  BISHOP: "#FFD700",
};

export function SpeechPanel({
  phase,
  decision,
  naivePlan,
  positions,
  rebuttals,
  searchQueries,
  contextBrief,
  finalPlan,
}: SpeechPanelProps) {
  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: 12,
        fontSize: 12,
        fontFamily: "'Courier New', monospace",
        lineHeight: 1.5,
      }}
    >
      {/* Recon */}
      {searchQueries.length > 0 && (
        <Section title="RECON">
          {searchQueries.map((q, i) => (
            <div key={i} style={{ color: "#888", marginBottom: 4 }}>
              🔍 {q}
            </div>
          ))}
          {contextBrief && (
            <div style={{ color: "#aaa", marginTop: 8, whiteSpace: "pre-wrap" }}>
              {contextBrief.slice(0, 500)}
              {contextBrief.length > 500 ? "..." : ""}
            </div>
          )}
        </Section>
      )}

      {/* Naive plan */}
      {naivePlan && (
        <Section title="BASELINE PLAN (v0)">
          <div style={{ color: "#888", whiteSpace: "pre-wrap" }}>
            {naivePlan.slice(0, 600)}
            {naivePlan.length > 600 ? "..." : ""}
          </div>
        </Section>
      )}

      {/* Round 1 positions */}
      {positions.size > 0 && (
        <Section title="ROUND 1 — POSITIONS">
          {Array.from(positions.entries()).map(([name, pos]) => (
            <div
              key={name}
              style={{
                marginBottom: 12,
                paddingLeft: 8,
                borderLeft: `3px solid ${MEMBER_COLORS[name] ?? "#666"}`,
              }}
            >
              <div style={{ color: MEMBER_COLORS[name] ?? "#fff", fontWeight: "bold" }}>
                {name} — votes: {pos.vote} ({(pos.confidence * 100).toFixed(0)}%)
              </div>
              <div style={{ color: "#aaa", marginTop: 4 }}>
                {pos.critique.slice(0, 300)}
                {pos.critique.length > 300 ? "..." : ""}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Rebuttals */}
      {rebuttals.length > 0 && (
        <Section title="ROUND 2 — CHALLENGES">
          {rebuttals.map((r, i) => (
            <div
              key={i}
              style={{
                marginBottom: 8,
                paddingLeft: 8,
                borderLeft: `3px solid ${MEMBER_COLORS[r.from] ?? "#666"}`,
              }}
            >
              <div>
                <span style={{ color: MEMBER_COLORS[r.from] ?? "#fff", fontWeight: "bold" }}>
                  {r.from}
                </span>
                <span style={{ color: "#666" }}> → </span>
                <span style={{ color: MEMBER_COLORS[r.to] ?? "#fff", fontWeight: "bold" }}>
                  {r.to}
                </span>
              </div>
              <div style={{ color: "#aaa", marginTop: 2 }}>
                {r.text.slice(0, 200)}
                {r.text.length > 200 ? "..." : ""}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Final plan */}
      {finalPlan && (
        <Section title="FINAL PLAN (v1)">
          <div style={{ color: "#00ff66", whiteSpace: "pre-wrap" }}>
            {finalPlan.slice(0, 1000)}
            {finalPlan.length > 1000 ? "..." : ""}
          </div>
        </Section>
      )}

      {/* Idle state */}
      {phase === "idle" && !decision && (
        <div style={{ color: "#444", textAlign: "center", marginTop: 40 }}>
          Waiting for council_plan MCP call...
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: "bold",
          color: "#666",
          letterSpacing: 1,
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
