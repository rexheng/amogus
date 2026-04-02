"use client";

import type { CouncilPhase } from "@/lib/types";

interface PhaseBarProps {
  phase: CouncilPhase;
  decision: string;
  connected: boolean;
}

const PHASE_STEPS: CouncilPhase[] = [
  "recon",
  "naive_plan",
  "round_1",
  "round_2",
  "voting",
  "verdict",
  "synthesis",
];

export function PhaseBar({ phase, decision, connected }: PhaseBarProps) {
  const activeIdx = PHASE_STEPS.indexOf(phase);

  return (
    <div
      style={{
        height: 48,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        background: "#0d0d1a",
        borderBottom: "2px solid #333",
        gap: 12,
      }}
    >
      {/* Connection indicator */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: connected ? "#00ff66" : "#ff3333",
          flexShrink: 0,
        }}
      />

      {/* Phase steps */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {PHASE_STEPS.map((step, i) => (
          <div
            key={step}
            style={{
              padding: "4px 8px",
              fontSize: 10,
              fontFamily: "'Courier New', monospace",
              fontWeight: i === activeIdx ? "bold" : "normal",
              color: i === activeIdx ? "#ffffff" : i < activeIdx ? "#666" : "#333",
              background: i === activeIdx ? "#cc3333" : "transparent",
              borderRadius: 4,
              textTransform: "uppercase",
            }}
          >
            {step.replace("_", " ")}
          </div>
        ))}
        {phase === "reaper" && (
          <div
            style={{
              padding: "4px 8px",
              fontSize: 10,
              fontFamily: "'Courier New', monospace",
              fontWeight: "bold",
              color: "#ff0000",
              background: "#330000",
              borderRadius: 4,
              animation: "pulse 0.5s infinite",
            }}
          >
            REAPER
          </div>
        )}
      </div>

      {/* Decision text */}
      <div
        style={{
          flex: 1,
          fontSize: 12,
          color: "#888",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "'Courier New', monospace",
        }}
      >
        {decision ? `"${decision}"` : "Waiting for council_plan call..."}
      </div>
    </div>
  );
}
