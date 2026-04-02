import type { CouncilState } from "./state.js";
import { spawnMutatedMember } from "./members.js";

const EXECUTION_THRESHOLD = 0.3;

/**
 * The Reaper: evaluates council member performance and executes the weakest.
 * Runs every 5 decisions.
 */
export function runReaper(state: CouncilState): void {
  const scores = state.members.map((member) => {
    const s = member.stats;
    if (s.totalDecisions === 0) return { member, score: 0.5 }; // New members get a pass

    const baseScore = (s.wins + s.overrideMatches) / s.totalDecisions;
    const defectionPenalty = (s.defections * 0.5) / s.totalDecisions;
    const score = Math.max(0, baseScore - defectionPenalty);

    return { member, score };
  });

  // Sort by score ascending — worst performer first
  scores.sort((a, b) => a.score - b.score);
  const worst = scores[0];
  const best = scores[scores.length - 1];

  if (!worst || !best) return;
  if (worst.score >= EXECUTION_THRESHOLD) return; // Everyone's doing fine

  console.error(
    `[reaper] Executing ${worst.member.definition.name}-v${worst.member.generation} ` +
      `(score: ${worst.score.toFixed(3)})`,
  );

  // Spawn replacement
  const newMember = spawnMutatedMember(worst.member, best.member);

  // Broadcast the execution event BEFORE replacing
  state.broadcast({
    event: "reaper",
    eliminated: {
      name: worst.member.definition.name,
      generation: worst.member.generation,
      winRate: worst.score,
    },
    newMember: {
      name: newMember.definition.name,
      generation: newMember.generation,
      lineage: newMember.lineage,
    },
  });

  // Replace in state
  state.replaceMember(worst.member.id, newMember);

  console.error(
    `[reaper] Spawned ${newMember.definition.name}-v${newMember.generation} ` +
      `(${newMember.definition.archetype} + ${best.member.definition.name} traits)`,
  );
}
