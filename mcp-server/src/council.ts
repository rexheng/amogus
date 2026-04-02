import Anthropic from "@anthropic-ai/sdk";
import type {
  CouncilRequest,
  MemberPosition,
  MemberChallenge,
  Verdict,
  DecisionRecord,
} from "./types.js";
import type { CouncilState } from "./state.js";
import { buildRound1Prompt, buildRound2Prompt } from "./members.js";
import { runRecon } from "./recon.js";
import { runReaper } from "./reaper.js";
import { synthesizePlan } from "./synthesis.js";

const client = new Anthropic();

/**
 * Main deliberation engine.
 * Orchestrates: recon → naive plan → round 1 → round 2 → verdict → synthesis → reaper
 */
export async function deliberate(
  state: CouncilState,
  request: CouncilRequest,
): Promise<{ finalPlan: string; verdict: Verdict; decisionId: string }> {
  const decisionId = state.nextDecisionId();

  // ─── PHASE: RECON ───
  state.setPhase("recon");
  state.broadcast({
    event: "meeting_called",
    decision: request.prompt,
    timestamp: Date.now(),
  });

  const recon = await runRecon(request.prompt);
  state.broadcast({
    event: "recon_start",
    searches: recon.searches.map((s) => s.query),
  });
  state.broadcast({ event: "recon_complete", brief: recon.summary });

  // ─── PHASE: NAIVE PLAN ───
  state.setPhase("naive_plan");
  const naivePlan = await generateNaivePlan(request.prompt, recon.summary);
  state.broadcast({ event: "naive_plan", plan: naivePlan });

  // ─── PHASE: ROUND 1 (isolated, parallel) ───
  state.setPhase("round_1");
  state.broadcast({
    event: "round_1_start",
    members: state.members.map((m) => m.definition.name),
  });

  const positions = await runRound1(state, request.prompt, recon.summary, naivePlan);

  // Check for unanimity
  const votes = positions.map((p) => p.vote);
  const unanimous = votes.every((v) => v === votes[0]);
  state.broadcast({ event: "round_1_complete", unanimous });

  // ─── PHASE: ROUND 2 (challenges, only if split) ───
  let challenges: MemberChallenge[] = [];
  if (!unanimous) {
    state.setPhase("round_2");
    state.broadcast({ event: "round_2_start" });
    challenges = await runRound2(state, request.prompt, positions);
  }

  // ─── PHASE: VERDICT ───
  state.setPhase("voting");
  const verdict = computeVerdict(state, positions, challenges);
  state.broadcast({ event: "verdict", verdict });

  // Update member stats
  const finalVotes = challenges.length > 0
    ? challenges.map((c) => ({ name: c.memberName, vote: c.finalVote }))
    : positions.map((p) => ({ name: p.memberName, vote: p.vote }));

  for (const member of state.members) {
    const memberVote = finalVotes.find((v) => v.name === member.definition.name);
    member.stats.totalDecisions++;
    if (memberVote?.vote === verdict.winningOption) {
      member.stats.wins++;
    } else {
      member.stats.losses++;
    }
  }

  // Track defections
  for (const challenge of challenges) {
    if (challenge.defected) {
      const member = state.members.find((m) => m.definition.name === challenge.memberName);
      if (member) member.stats.defections++;
    }
  }

  // ─── PHASE: SYNTHESIS ───
  state.setPhase("synthesis");
  const finalPlan = await synthesizePlan(
    request.prompt,
    recon.summary,
    naivePlan,
    positions,
    challenges,
    verdict,
  );
  state.broadcast({
    event: "synthesis_complete",
    finalPlan,
    dissent: verdict.dissent,
  });

  // Record decision
  const record: DecisionRecord = {
    id: decisionId,
    timestamp: Date.now(),
    prompt: request.prompt,
    naivePlan,
    positions,
    challenges,
    verdict,
    finalPlan,
  };
  state.recordDecision(record);

  // ─── PHASE: REAPER (every 5 decisions) ───
  if (state.decisionCounter % 5 === 0 && state.decisionCounter > 0) {
    state.setPhase("reaper");
    runReaper(state);
  }

  state.setPhase("idle");
  return { finalPlan, verdict, decisionId };
}

async function generateNaivePlan(prompt: string, contextBrief: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `Generate a straightforward implementation plan for this project. Keep it concise — numbered steps, no detailed sub-tasks. This is a first-draft plan.

Context from research:
${contextBrief}

Project: ${prompt}`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

async function runRound1(
  state: CouncilState,
  prompt: string,
  contextBrief: string,
  naivePlan: string,
): Promise<MemberPosition[]> {
  // Fire all 4 calls in parallel — no member sees any other's output
  const positionPromises = state.members.map(async (member) => {
    const memberPrompt = buildRound1Prompt(member, prompt, contextBrief, naivePlan);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: memberPrompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let parsed: Record<string, unknown>;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = {};
    }

    const position: MemberPosition = {
      memberId: member.id,
      memberName: member.definition.name,
      frameworkAnswers: (parsed.framework_answers as Record<string, string>) ?? {},
      critique: (parsed.critique as string) ?? text.slice(0, 500),
      revisedPlan: (parsed.revised_plan as string) ?? "",
      vote: (parsed.vote as string) ?? "revised",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };

    // Broadcast as each member completes (real-time feel)
    state.broadcast({ event: "round_1_position", member: member.definition.name, position });

    return position;
  });

  return Promise.all(positionPromises);
}

async function runRound2(
  state: CouncilState,
  prompt: string,
  positions: MemberPosition[],
): Promise<MemberChallenge[]> {
  const challengePromises = state.members.map(async (member) => {
    const ownPosition = positions.find((p) => p.memberId === member.id)!;
    const allPositionsSummary = positions.map((p) => ({
      memberName: p.memberName,
      critique: p.critique,
      revisedPlan: p.revisedPlan,
      vote: p.vote,
      confidence: p.confidence,
    }));

    const memberPrompt = buildRound2Prompt(member, prompt, allPositionsSummary, {
      vote: ownPosition.vote,
      confidence: ownPosition.confidence,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: memberPrompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let parsed: Record<string, unknown>;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = {};
    }

    const challenge: MemberChallenge = {
      memberId: member.id,
      memberName: member.definition.name,
      challengeTarget: (parsed.challenge_target as string) ?? "",
      challenge: (parsed.challenge as string) ?? text.slice(0, 500),
      finalVote: (parsed.final_vote as string) ?? ownPosition.vote,
      previousVote: ownPosition.vote,
      defected: (parsed.defected as boolean) ?? false,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : ownPosition.confidence,
    };

    // Broadcast rebuttal
    state.broadcast({
      event: "rebuttal",
      from: member.definition.name,
      to: challenge.challengeTarget,
      text: challenge.challenge,
    });

    // Broadcast vote
    state.broadcast({
      event: "vote",
      member: member.definition.name,
      option: challenge.finalVote,
      confidence: challenge.confidence,
      defected: challenge.defected,
    });

    return challenge;
  });

  return Promise.all(challengePromises);
}

function computeVerdict(
  state: CouncilState,
  positions: MemberPosition[],
  challenges: MemberChallenge[],
): Verdict {
  // Use Round 2 votes if available, otherwise Round 1
  const finalVotes = challenges.length > 0
    ? challenges.map((c) => ({
        memberName: c.memberName,
        vote: c.finalVote,
        confidence: c.confidence,
      }))
    : positions.map((p) => ({
        memberName: p.memberName,
        vote: p.vote,
        confidence: p.confidence,
      }));

  // Weight votes by confidence × track record
  const weightedVotes: Record<string, number> = {};
  const voteDetails: Verdict["votes"] = [];

  for (const fv of finalVotes) {
    const member = state.members.find((m) => m.definition.name === fv.memberName);
    const trackRecord =
      member && member.stats.totalDecisions > 0
        ? (member.stats.wins + member.stats.overrideMatches) / member.stats.totalDecisions
        : 0.5; // New members get neutral weight

    const weight = fv.confidence * (0.5 + 0.5 * trackRecord); // Blend confidence with track record
    weightedVotes[fv.vote] = (weightedVotes[fv.vote] ?? 0) + weight;
    voteDetails.push({
      memberName: fv.memberName,
      vote: fv.vote,
      confidence: fv.confidence,
      weight,
    });
  }

  // Find winner
  const sortedOptions = Object.entries(weightedVotes).sort(([, a], [, b]) => b - a);
  const winningOption = sortedOptions[0]?.[0] ?? "revised";
  const totalWeight = Object.values(weightedVotes).reduce((a, b) => a + b, 0);
  const confidence = totalWeight > 0 ? (weightedVotes[winningOption] ?? 0) / totalWeight : 0;

  // Collect dissenting opinions
  const dissent = voteDetails
    .filter((v) => v.vote !== winningOption)
    .map((v) => {
      const pos = positions.find((p) => p.memberName === v.memberName);
      return `${v.memberName}: ${pos?.critique?.slice(0, 200) ?? "Dissented without detail."}`;
    });

  return { winningOption, confidence, votes: voteDetails, dissent };
}
