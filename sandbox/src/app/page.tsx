"use client";

import { useCouncilSocket } from "@/hooks/useCouncilSocket";
import { MeetingRoom } from "@/components/MeetingRoom";
import { SpeechPanel } from "@/components/SpeechPanel";
import { VotePanel } from "@/components/VotePanel";
import { Gallows } from "@/components/Gallows";
import { Leaderboard } from "@/components/Leaderboard";
import { PhaseBar } from "@/components/PhaseBar";

export default function Home() {
  const council = useCouncilSocket();

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Status bar */}
      <PhaseBar
        phase={council.phase}
        decision={council.decision}
        connected={council.connected}
      />

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left column: Meeting room canvas */}
        <div style={{ flex: 2, position: "relative" }}>
          <MeetingRoom
            members={council.members}
            phase={council.phase}
            positions={council.positions}
            votes={council.votes}
            reaper={council.reaper}
          />
        </div>

        {/* Right column: Speech + Vote panels */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderLeft: "2px solid #333",
            maxWidth: 420,
          }}
        >
          <SpeechPanel
            phase={council.phase}
            decision={council.decision}
            naivePlan={council.naivePlan}
            positions={council.positions}
            rebuttals={council.rebuttals}
            searchQueries={council.searchQueries}
            contextBrief={council.contextBrief}
            finalPlan={council.finalPlan}
          />
          <VotePanel votes={council.votes} verdict={council.verdict} />
        </div>
      </div>

      {/* Bottom bar: Gallows + Leaderboard */}
      <div
        style={{
          height: 160,
          display: "flex",
          borderTop: "2px solid #333",
          background: "#0d0d1a",
        }}
      >
        <Gallows reaper={council.reaper} />
        <Leaderboard members={council.members} />
      </div>
    </div>
  );
}
