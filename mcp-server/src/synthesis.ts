import Anthropic from "@anthropic-ai/sdk";
import type { MemberPosition, MemberChallenge, Verdict } from "./types.js";

const client = new Anthropic();

/**
 * The Clerk: a neutral synthesizer that compiles council deliberation
 * into a structured, actionable plan. Not a council member — no personality, no bias.
 */
export async function synthesizePlan(
  prompt: string,
  contextBrief: string,
  naivePlan: string,
  positions: MemberPosition[],
  challenges: MemberChallenge[],
  verdict: Verdict,
): Promise<string> {
  const positionsBlock = positions
    .map(
      (p) =>
        `── ${p.memberName} (voted: ${p.vote}, confidence: ${p.confidence}) ──
Framework answers:
${Object.entries(p.frameworkAnswers)
  .map(([k, v]) => `  ${k}: ${v}`)
  .join("\n")}
Critique: ${p.critique}
Revised plan: ${p.revisedPlan}`,
    )
    .join("\n\n");

  const challengesBlock =
    challenges.length > 0
      ? challenges
          .map(
            (c) =>
              `${c.memberName} → ${c.challengeTarget}: ${c.challenge}
  Final vote: ${c.finalVote} (${c.defected ? "DEFECTED" : "held"}, confidence: ${c.confidence})`,
          )
          .join("\n\n")
      : "No challenges (unanimous Round 1).";

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are the Clerk — a neutral plan synthesizer. You have NO personality, NO bias. Your job is to compile the council's deliberation into the best possible plan.

═══ ORIGINAL PROMPT ═══
${prompt}

═══ RESEARCH CONTEXT ═══
${contextBrief}

═══ NAIVE PLAN (baseline) ═══
${naivePlan}

═══ COUNCIL POSITIONS (Round 1) ═══
${positionsBlock}

═══ CHALLENGES (Round 2) ═══
${challengesBlock}

═══ VERDICT ═══
Winner: ${verdict.winningOption} (confidence: ${verdict.confidence.toFixed(2)})
Vote breakdown: ${verdict.votes.map((v) => `${v.memberName}=${v.vote}`).join(", ")}

═══ YOUR TASK ═══
Produce a FINAL PLAN that:
1. Uses the winning revision as the base
2. Incorporates valid concerns from ALL members (including dissenters)
3. Flags unresolved disagreements as "⚠️ DISSENT" footnotes
4. Is structured with clear phases, dependencies, and effort indicators
5. Is actionable — a developer should be able to start building from this plan

Format the plan as structured markdown with:
- Numbered phases with clear deliverables
- Dependencies between phases noted
- Risk callouts from GHOST's concerns
- Technology choices backed by SCOUT's research
- Architecture notes from BISHOP's analysis
- Timeline reality-checks from RAZOR's estimates`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
