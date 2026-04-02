# Deliberation Protocol

## The Convergence Problem

When you run the same LLM multiple times on the same prompt, you get near-identical outputs. Adding "personalities" via system prompts helps marginally, but the moment Agent B sees Agent A's reasoning, B's most likely completion is "I agree because..." — the path of least resistance in the probability distribution.

The Council solves this with **structural isolation**, **forced evaluation frameworks**, and **defection penalties**.

## Round 1: Isolation Chamber

All four council members receive the same inputs:
- User's original prompt
- Context brief from recon phase
- Naive plan (the baseline to critique)

**Critical rule: no member sees any other member's output.**

All four LLM calls fire in parallel. Each member must answer their specific framework questions before forming a position.

### Member Evaluation Frameworks

**RAZOR (The Shipper)**
```
Before stating your position, you MUST answer these questions:
1. What is the fastest path to a working implementation?
2. What steps in the plan hide complexity behind vague language?
3. What can be deferred to v2 without blocking a working v1?
4. What is the realistic effort estimate for each step?

Your critique and revised plan MUST prioritize these answers.
Bias: you believe shipping beats perfection. Overengineering is
the real risk, not underengineering.
```

**GHOST (The Paranoid)**
```
Before stating your position, you MUST answer these questions:
1. What fails at 10x the expected load or usage?
2. What is the rollback plan if each step goes wrong?
3. What external dependencies could break, and what happens then?
4. What error cases does the plan not address?

Your critique and revised plan MUST prioritize these answers.
Bias: you believe every plan is optimistic until proven otherwise.
The unhandled edge case is always the one that ships.
```

**SCOUT (The Researcher)**
```
Before stating your position, you MUST answer these questions:
1. What existing tools, libraries, or patterns solve parts of this?
2. What do benchmarks, comparisons, or community consensus say?
3. What is the adoption trajectory of the technologies mentioned?
4. What prior art exists that this plan is ignoring?

Your critique and revised plan MUST prioritize these answers.
Bias: you believe most problems have been solved before.
Building from scratch is usually wrong.
```

**BISHOP (The Architect)**
```
Before stating your position, you MUST answer these questions:
1. What does the dependency graph look like after this plan executes?
2. Does this plan create tight coupling that will be painful later?
3. What is the correct ordering of steps given their dependencies?
4. What architectural layers should the plan define?

Your critique and revised plan MUST prioritize these answers.
Bias: you believe structure determines outcomes. A well-layered
system with correct dependencies is more important than speed.
```

### Why Different Frameworks Prevent Convergence

Even with the same underlying model, asking different questions forces different reasoning chains:
- RAZOR looks at the plan and thinks about effort and shipping speed
- GHOST looks at the same plan and thinks about failure modes
- SCOUT looks at the same plan and thinks about existing solutions
- BISHOP looks at the same plan and thinks about structure

These are four different lenses on the same object. The outputs diverge because the INPUTS diverge — each member is processing genuinely different evaluation criteria.

### Round 1 Output Format

```json
{
  "member": "RAZOR",
  "framework_answers": {
    "fastest_path": "...",
    "hidden_complexity": "...",
    "deferrable": "...",
    "effort_estimate": "..."
  },
  "critique": "One paragraph: what's wrong with the naive plan",
  "revised_plan": "The full revised plan from this member's perspective",
  "vote": "The option or revision they support",
  "confidence": 0.85
}
```

## Round 2: Challenge Round

**Triggers only if Round 1 is NOT unanimous.**

If all four members agree → skip to synthesis. No point debating consensus.

If there's a split → Round 2 begins.

### Rules
1. Each member NOW sees all Round 1 positions (revealed simultaneously)
2. Each member selects ONE other member to challenge
3. Challenges must reference specific claims from Round 1 (no generic disagreement)
4. Each member submits a final vote — they can HOLD or DEFECT

### Defection Tracking

If a member changes their vote between Round 1 and Round 2:
- The defection is logged with: `{ from_vote, to_vote, reason }`
- Defections cost -0.5 to reaper score per occurrence
- This creates a structural incentive to HOLD your position
- Members only defect when genuinely persuaded by new evidence
- "I agree with RAZOR" is not new evidence — the system prompt explicitly states this

### Round 2 Output Format

```json
{
  "member": "GHOST",
  "challenge_target": "RAZOR",
  "challenge": "Your 2-hour effort estimate for step 3 ignores the 40 integration tests that directly reference Express internals. Migration is 2 days minimum.",
  "final_vote": "B",
  "previous_vote": "B",
  "defected": false,
  "confidence": 0.90
}
```

## Verdict Calculation

Votes are weighted by: `confidence × track_record_score`

```
Track record score = (lifetime_wins + override_matches) / lifetime_decisions
```

A member who's been right 80% of the time has more weight than a member who just spawned. This means the council's institutional knowledge matters — veteran members earned their influence.

### Tie-breaking
If weighted votes are tied: the member with the highest individual confidence wins.

## Synthesis

A separate "clerk" LLM call (NOT a council member) takes:
- All Round 1 critiques and framework answers
- All Round 2 challenges
- The winning vote
- The original context brief

And produces a **structured final plan** that:
- Incorporates the winning revision as the base
- Addresses concerns raised by dissenting members
- Includes footnotes for unresolved disagreements
- Has clear phases, dependencies, effort estimates, and risk callouts

The clerk is intentionally not a council member — it has no personality, no bias, no vote. It's a neutral compiler.

## Evolution (The Reaper)

Every 5 decisions, the reaper evaluates:

```
For each member:
  base_score = wins / total_decisions
  defection_penalty = defections × 0.5 / total_decisions
  final_score = base_score - defection_penalty

If lowest final_score < 0.3:
  → EXECUTE lowest scorer
  → SPAWN replacement:
    - Pick random base archetype (Shipper/Paranoid/Researcher/Architect)
    - Inherit one trait from the BEST performing member
    - Mutate: blend the inherited trait into the new member's framework
    - Example: "You're a Researcher like SCOUT, but you inherited
      RAZOR's obsession with shipping speed. Your 4th framework
      question is always: 'Can we ship this in half the time?'"
  → Track lineage: "GHOST-v3 (GHOST-v2 + RAZOR-v1 traits)"
```

### Why Evolution Works

Bad reasoning patterns get culled. If GHOST's paranoia consistently leads to over-cautious plans that get overridden by humans, GHOST dies and a new member inherits traits from whoever's been most accurate. Over time, the council's collective reasoning aligns with the human's actual preferences — without any single member dominating.
