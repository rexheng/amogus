# Architecture

## System Overview

The Council is an MCP server that any coding agent (Cursor, Claude Code, etc.) can invoke to get structured multi-perspective planning. It exposes tools over the Model Context Protocol and streams deliberation events to a web-based sandbox UI via WebSocket.

```
┌─────────────────────────┐
│   Agent Session          │
│   (Cursor / Claude Code) │
└───────────┬─────────────┘
            │ MCP call: council_plan
            ▼
┌─────────────────────────┐     WebSocket      ┌──────────────────┐
│   MCP Server             │ ─────────────────► │   Sandbox UI      │
│   (Node.js / TypeScript) │                    │   (Next.js)       │
│                          │ ◄───────────────── │                   │
│   • Recon phase          │     HTTP /status   │   • Among Us viz  │
│   • Deliberation engine  │                    │   • Live debate   │
│   • Reaper / evolution   │                    │   • Gallows       │
│   • State management     │                    │   • Leaderboard   │
└─────────────────────────┘                     └──────────────────┘
            │
            ▼
┌─────────────────────────┐
│   Anthropic API          │
│   (Claude — parallel     │
│    calls per member)     │
└─────────────────────────┘
```

## MCP Server Components

### `index.ts` — Entry Point
- Registers MCP tools: `council_plan`, `council_members`, `council_history`, `council_override`, `council_sandbox`
- Starts WebSocket server for sandbox UI connection
- Handles MCP stdio transport

### `recon.ts` — Context Gathering
- Parses user prompt to extract key topics
- Fires 3-5 parallel web searches
- Compiles results into a ~2000 token context brief
- No embeddings, no vector DB — raw search results, trimmed and concatenated

### `council.ts` — Deliberation Engine
The core orchestrator. Handles the full deliberation flow:

```
1. Generate naive plan (single LLM call — the "before")
2. Broadcast: meeting_called event
3. Round 1: Fire 4 parallel LLM calls (one per member)
   - Each member receives: prompt + context brief + naive plan
   - Each member answers their framework questions
   - Each member proposes critique + revised plan
   - NO member sees any other member's output
   - Broadcast: round_1_position events as they complete
4. Check unanimity — if all agree, skip to synthesis
5. Round 2: Fire 4 parallel LLM calls
   - Each member NOW sees all Round 1 positions
   - Each member can challenge ONE other member
   - Each member submits final vote (can hold or defect)
   - Broadcast: rebuttal events, then vote events
6. Detect defections, log to reaper
7. Pass all critiques + winning revision to synthesis
```

### `members.ts` — Council Member Definitions
Each member is defined by:
- `name`: Display name (RAZOR, GHOST, SCOUT, BISHOP)
- `color`: Among Us crewmate color
- `archetype`: One-line description
- `systemPrompt`: Full personality + evaluation framework
- `stats`: Win/loss record, defection count, streak

The system prompt is the key anti-convergence mechanism. Each member has a FORCED evaluation framework — specific questions they must answer before forming a position. Different questions → different reasoning chains → different votes.

### `reaper.ts` — Evolution Logic
```
Every 5 decisions:
  1. Score each member:
     score = (wins + override_matches) / total_decisions
  2. If lowest scorer < 0.3 threshold:
     - Mark as EXECUTED
     - Broadcast: reaper event with eliminated member
     - Spawn new member:
       - Random base archetype
       - Inherit top trait from best performer
       - Mutate: blend inherited trait with new random trait
       - Track lineage
  3. Update leaderboard
```

### `synthesis.ts` — Plan Compilation
A separate "clerk" LLM call that:
- Takes all Round 1 critiques + Round 2 challenges + winning vote
- Produces a structured, actionable plan
- Preserves dissenting opinions as footnotes
- Outputs markdown with clear phases, dependencies, and risk callouts

### `state.ts` — State + Broadcast
- In-memory state for current council roster, decision history, scores
- WebSocket broadcast helper: sends typed events to connected sandbox UIs
- Event types: `meeting_called`, `recon_complete`, `round_1_position`, `rebuttal`, `vote`, `verdict`, `reaper`, `new_member`

## Sandbox UI Components

### `MeetingTable.tsx`
Oval table in the center. Among Us emergency meeting aesthetic. Dark background, red accents. Crewmates positioned around it.

### `Crewmate.tsx`
Among Us character silhouette. Props: color, name, accessory, state (idle/speaking/voting/dead). Animated — idle bounce, speaking glow, death fade.

### `SpeechBubble.tsx`
Appears above crewmate during rounds. Streams text in real-time (character by character for drama). Color-coded border matching crewmate. Shows challenge arrows connecting to target member during rebuttals.

### `VoteBar.tsx`
Horizontal bars for each option. Fill animation on vote. Shows which crewmate voted for what. Among Us vote screen style.

### `Gallows.tsx`
Bottom-left panel. Rope + platform. When reaper fires: character slides in, rope drops, fade to skull, ejection text ("GHOST-v1 was eliminated. Win rate: .200").

### `Leaderboard.tsx`
Bottom-right panel. Ranked list of members with W-L records and streaks. Dead members shown greyed with skull icon and lineage info.

### `ReaperAnimation.tsx`
Full-screen overlay. Red flash, "REAPER ACTIVATED" text, spotlight on lowest performer, drag animation to gallows.

## WebSocket Event Contract

```typescript
// Server → UI events

type CouncilEvent =
  | { event: "meeting_called"; decision: string; options: string[] }
  | { event: "recon_complete"; brief: string; searches: string[] }
  | { event: "naive_plan"; plan: string }
  | { event: "round_1_position"; member: string; position: MemberPosition }
  | { event: "rebuttal"; from: string; to: string; text: string }
  | { event: "vote"; member: string; option: string; confidence: number; defected: boolean }
  | { event: "verdict"; option: string; confidence: number; plan: string }
  | { event: "reaper"; eliminated: MemberInfo; newMember: MemberInfo }
  | { event: "synthesis_complete"; finalPlan: string; dissent: string[] }

type MemberPosition = {
  frameworkAnswers: Record<string, string>
  critique: string
  revisedPlan: string
  vote: string
  confidence: number
}
```

## Why This Architecture

**MCP-first**: Any agent can call `council_plan`. It's not locked to Cursor. It's a runtime primitive.

**Parallel by default**: Round 1 fires all 4 member calls simultaneously. No sequential bottleneck. Total latency ≈ latency of the slowest single call, not 4x.

**UI is optional**: The MCP server works without the sandbox. The sandbox is a visualization layer connected via WebSocket. You can run the council headless in CI or connect multiple UIs.

**Stateless deliberation, stateful evolution**: Each deliberation is independent (no memory between decisions). But member performance is tracked persistently for the reaper. This means the council gets better over time without individual decisions leaking into each other.
