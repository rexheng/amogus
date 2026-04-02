"use client";

import { useEffect, useState } from "react";
import type { SandboxEvent } from "@/lib/types";

interface GallowsProps {
  reaper: (SandboxEvent & { event: "reaper" }) | null;
}

export function Gallows({ reaper }: GallowsProps) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (reaper) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [reaper]);

  return (
    <div
      style={{
        flex: 1,
        padding: 12,
        fontFamily: "'Courier New', monospace",
        position: "relative",
        overflow: "hidden",
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
        THE GALLOWS
      </div>

      {!reaper && !showAnimation && (
        <div style={{ color: "#333", fontSize: 11 }}>No current execution</div>
      )}

      {reaper && (
        <div
          style={{
            animation: showAnimation ? "fadeIn 0.5s ease" : undefined,
          }}
        >
          {/* Gallows ASCII art */}
          <pre
            style={{
              color: showAnimation ? "#ff0000" : "#444",
              fontSize: 10,
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {`  ┌────┐
  │    │
  │    O
  │   /|\\
  │   / \\
  │
 ─┴──────`}
          </pre>

          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: showAnimation ? "#ff0000" : "#666",
              fontWeight: "bold",
            }}
          >
            {reaper.eliminated.name}-v{reaper.eliminated.generation} ELIMINATED
          </div>
          <div style={{ fontSize: 10, color: "#888" }}>
            Win rate: {(reaper.eliminated.winRate * 100).toFixed(0)}%
          </div>

          {reaper.newMember && (
            <div style={{ marginTop: 8, fontSize: 10, color: "#00ff66" }}>
              + {reaper.newMember.name}-v{reaper.newMember.generation} spawned
              <div style={{ color: "#666", marginTop: 2 }}>
                {reaper.newMember.lineage[reaper.newMember.lineage.length - 1]}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
