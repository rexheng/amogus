# Demo Script — 4 Minutes

## Setup
- Terminal: Cursor or Claude Code session with The Council MCP connected
- Browser: Sandbox UI open on second screen / split view
- Prompt pre-loaded: `"build me Cursor, make no mistakes"`

---

## 0:00–0:30 — THE PROBLEM

**[Terminal]** Type: _"build me Cursor, make no mistakes"_ into a standard agent.

Show the output — a naive 5-step plan:

```
1. Set up Electron app
2. Add Monaco editor
3. Implement AI features
4. Add file system support
5. Ship it
```

**Say:** _"Step 3 — implement AI features — that's 80% of the project hidden in one bullet. This is what happens when one agent plans alone. No one challenges it."_

---

## 0:30–1:00 — THE COUNCIL ACTIVATES

**[Terminal]** Now run the same prompt through The Council MCP tool.

**[Sandbox UI]** Emergency meeting alarm fires. Screen goes red. "EMERGENCY MEETING" slams in.

Four crewmates slide into position around the table.

**Say:** _"The Council is an MCP server. Any agent can call it. Instead of planning alone, it spawns four AI crewmates — each with a different engineering perspective — who debate the plan before a single line of code is written."_

**[Sandbox UI]** Recon phase: search queries fly across the screen, context brief appears.

---

## 1:00–2:30 — THE DEBATE

**[Sandbox UI]** Round 1 begins. Speech bubbles appear above each crewmate in real-time.

**Narrate the highlights as they appear:**

- **RAZOR** (red): _"Step 3 is hiding five sub-tasks. Inline completion, chat panel, codebase indexing, context retrieval, and prompt engineering are all separate workstreams."_

- **GHOST** (blue): _"No error handling anywhere. What happens when the LSP server crashes mid-edit? What about concurrent file access? Where's the recovery plan?"_

- **SCOUT** (green): _"Tree-sitter WASM bindings already exist. Codemirror 6 has a better extension API than Monaco for this use case. Don't build what you can import."_

- **BISHOP** (yellow): _"The plan has no layers. You need four: shell (Tauri), editor (CM6), intelligence (LSP + AI), and storage (fs + state). Step order is wrong — storage before editor."_

**Say:** _"Four different lenses, four different critiques. And they can't see each other's answers until all votes are locked. That's how you prevent convergence."_

**[Sandbox UI]** Round 2: challenge lines draw between crewmates. RAZOR challenges BISHOP. GHOST challenges SCOUT. Rebuttals appear.

---

## 2:30–3:00 — THE VOTE

**[Sandbox UI]** Vote bars fill up. Among Us voting screen aesthetic.

- BISHOP's architectural revision: 3 votes
- RAZOR's minimal MVP: 1 vote

**GHOST defects** from their original position to support BISHOP's layered approach. Defection logged — ⚠️ icon appears.

**Say:** _"GHOST changed their vote. That costs them reputation. The reaper is watching."_

---

## 3:00–3:30 — THE RESULT

**[Split view]** Side by side: naive plan (5 vague steps) vs council plan (structured, layered, with dependencies and risk callouts).

**Say:** _"Same prompt. The council plan has correct architecture layers, real technology choices backed by research, error handling, and honest effort estimates. This is what planning looks like when your ideas get challenged before execution."_

---

## 3:30–3:50 — THE GALLOWS

**[Sandbox UI]** Fast-forward to show reaper in action (pre-recorded or triggered).

Screen flashes red. "REAPER ACTIVATED." Spotlight on the lowest performer.

Character gets dragged to the gallows. Rope drops. Fade to skull.

_"GHOST-v1 was eliminated. Win rate: .200"_

New character spawns in a puff of smoke: _"GHOST-v2 has entered. Lineage: GHOST-v1 + SCOUT traits."_

**Say:** _"The council evolves. Bad planners die. Good traits propagate. Over time, the council gets better at planning for YOUR codebase."_

---

## 3:50–4:00 — THE CLOSE

**Say:** _"One MCP call. Any agent gets a council. This is The Council — structured disagreement as a service."_

---

## Fallback Plans

**If LLM calls are slow:** Pre-cache the Round 1 outputs. Let the UI animate them in real-time. Round 2 + vote runs live.

**If WebSocket disconnects:** Sandbox UI has a replay mode that can animate from a saved event log.

**If a judge asks "is this staged?":** Show that the member prompts are generic — they work on any planning prompt, not just "build me Cursor." Offer to run a different prompt live.
