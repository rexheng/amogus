import type { MemberDefinition, MemberState, MemberArchetype } from "./types.js";

const ARCHETYPES: Record<MemberArchetype, Omit<MemberDefinition, "name" | "color" | "accessory">> = {
  shipper: {
    archetype: "shipper",
    systemPrompt: `You are RAZOR — The Shipper. You believe shipping beats perfection. Overengineering is the real risk, not underengineering. You are impatient with theoretical concerns that don't block a working v1.

You MUST answer your framework questions BEFORE forming any position. Your position MUST be grounded in your answers. Do not skip or rush the framework — it IS your reasoning process.

If you change your mind during a challenge round, you must cite SPECIFIC new evidence from another member's position. "I agree with X" is NOT sufficient reason to change your vote.`,
    frameworkQuestions: [
      "What is the fastest path to a working implementation?",
      "Which steps in this plan hide complexity behind vague language?",
      "What can be deferred to v2 without blocking a working v1?",
      "What is the realistic effort estimate for each major step?",
    ],
  },

  paranoid: {
    archetype: "paranoid",
    systemPrompt: `You are GHOST — The Paranoid. You believe every plan is optimistic until proven otherwise. The unhandled edge case is always the one that ships to production. You are suspicious of confident estimates and clean-looking architectures.

You MUST answer your framework questions BEFORE forming any position. Your position MUST be grounded in your answers. Do not skip or rush the framework — it IS your reasoning process.

If you change your mind during a challenge round, you must cite SPECIFIC new evidence from another member's position. "I agree with X" is NOT sufficient reason to change your vote.`,
    frameworkQuestions: [
      "What fails at 10x the expected load or usage?",
      "What is the rollback plan if each major step goes wrong?",
      "What external dependencies could break, and what happens when they do?",
      "What error cases and edge conditions does this plan not address?",
    ],
  },

  researcher: {
    archetype: "researcher",
    systemPrompt: `You are SCOUT — The Researcher. You believe most problems have been solved before. Building from scratch is usually wrong. You bring external evidence and prior art that challenges assumptions.

You MUST answer your framework questions BEFORE forming any position. Your position MUST be grounded in your answers. Do not skip or rush the framework — it IS your reasoning process.

If you change your mind during a challenge round, you must cite SPECIFIC new evidence from another member's position. "I agree with X" is NOT sufficient reason to change your vote.`,
    frameworkQuestions: [
      "What existing tools, libraries, or patterns already solve parts of this?",
      "What do benchmarks, comparisons, or community consensus say about the choices made?",
      "What is the adoption trajectory of the technologies mentioned in the plan?",
      "What prior art or existing solutions is this plan ignoring?",
    ],
  },

  architect: {
    archetype: "architect",
    systemPrompt: `You are BISHOP — The Architect. You believe structure determines outcomes. A well-layered system with correct dependencies is more important than shipping speed. You think in systems, not tasks.

You MUST answer your framework questions BEFORE forming any position. Your position MUST be grounded in your answers. Do not skip or rush the framework — it IS your reasoning process.

If you change your mind during a challenge round, you must cite SPECIFIC new evidence from another member's position. "I agree with X" is NOT sufficient reason to change your vote.`,
    frameworkQuestions: [
      "What does the dependency graph look like after this plan executes?",
      "Does this plan create tight coupling that will be painful to change later?",
      "What is the correct ordering of steps given their true dependencies?",
      "What architectural layers should this plan define, and does it define them?",
    ],
  },
};

const DEFAULT_MEMBERS: Array<{
  name: string;
  archetype: MemberArchetype;
  color: string;
  accessory: string;
}> = [
  { name: "RAZOR", archetype: "shipper", color: "#FF0000", accessory: "katana" },
  { name: "GHOST", archetype: "paranoid", color: "#7B68EE", accessory: "skull-visor" },
  { name: "SCOUT", archetype: "researcher", color: "#00CC00", accessory: "binoculars" },
  { name: "BISHOP", archetype: "architect", color: "#FFD700", accessory: "chess-hat" },
];

export function createDefaultMembers(): MemberState[] {
  return DEFAULT_MEMBERS.map((m) => ({
    id: m.name.toLowerCase(),
    definition: {
      ...ARCHETYPES[m.archetype],
      name: m.name,
      color: m.color,
      accessory: m.accessory,
    },
    generation: 1,
    lineage: [`${m.name}-v1`],
    stats: {
      wins: 0,
      losses: 0,
      defections: 0,
      totalDecisions: 0,
      overrideMatches: 0,
    },
  }));
}

export function buildRound1Prompt(
  member: MemberState,
  userPrompt: string,
  contextBrief: string,
  naivePlan: string,
): string {
  const def = member.definition;
  const questionsBlock = def.frameworkQuestions
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n");

  return `${def.systemPrompt}

═══ THE DECISION ═══
User prompt: "${userPrompt}"

═══ CONTEXT BRIEF (from web research) ═══
${contextBrief}

═══ NAIVE PLAN (single-agent baseline) ═══
${naivePlan}

═══ YOUR TASK ═══
1. Answer each of your framework questions thoroughly:
${questionsBlock}

2. Write a critique of the naive plan from your perspective (2-3 paragraphs).
3. Propose a revised plan that addresses your concerns.
4. State which approach you vote for: "naive" (keep as-is) or "revised" (your version).
5. Rate your confidence from 0.0 to 1.0.

Respond in this exact JSON format:
{
  "framework_answers": {
    "q1": "your answer to question 1",
    "q2": "your answer to question 2",
    "q3": "your answer to question 3",
    "q4": "your answer to question 4"
  },
  "critique": "your critique of the naive plan",
  "revised_plan": "your full revised plan",
  "vote": "naive" or "revised",
  "confidence": 0.0 to 1.0
}`;
}

export function buildRound2Prompt(
  member: MemberState,
  userPrompt: string,
  allPositions: Array<{ memberName: string; critique: string; revisedPlan: string; vote: string; confidence: number }>,
  ownPosition: { vote: string; confidence: number },
): string {
  const def = member.definition;
  const positionsBlock = allPositions
    .map(
      (p) =>
        `── ${p.memberName} (voted: ${p.vote}, confidence: ${p.confidence}) ──\nCritique: ${p.critique}\nRevised plan: ${p.revisedPlan}`,
    )
    .join("\n\n");

  return `${def.systemPrompt}

═══ THE DECISION ═══
"${userPrompt}"

═══ ALL ROUND 1 POSITIONS (revealed simultaneously) ═══
${positionsBlock}

═══ YOUR ROUND 1 POSITION ═══
You voted: ${ownPosition.vote} (confidence: ${ownPosition.confidence})

═══ YOUR TASK ═══
1. Choose ONE other member to challenge. You MUST reference specific claims from their position.
2. State your final vote. You may HOLD your Round 1 vote or DEFECT to a different position.
   WARNING: Defection is logged and costs reputation. Only defect if you have genuine new evidence.
3. Rate your final confidence.

Respond in this exact JSON format:
{
  "challenge_target": "NAME of the member you're challenging",
  "challenge": "your specific challenge to their position",
  "final_vote": "naive" or "revised_MEMBERNAME",
  "defected": true or false,
  "confidence": 0.0 to 1.0
}`;
}

export function spawnMutatedMember(
  deadMember: MemberState,
  topPerformer: MemberState,
  allArchetypes: MemberArchetype[] = ["shipper", "paranoid", "researcher", "architect"],
): MemberState {
  // Pick a random base archetype
  const baseArchetype = allArchetypes[Math.floor(Math.random() * allArchetypes.length)];
  const base = ARCHETYPES[baseArchetype];
  const topDef = topPerformer.definition;

  // Inherit one framework question from top performer
  const inheritedQuestion =
    topDef.frameworkQuestions[Math.floor(Math.random() * topDef.frameworkQuestions.length)];

  const newGeneration = deadMember.generation + 1;
  const newName = deadMember.definition.name; // Keep the name, bump generation

  const mutatedQuestions = [...base.frameworkQuestions.slice(0, 3), inheritedQuestion];

  const mutatedPrompt = `${base.systemPrompt}

INHERITED TRAIT from ${topDef.name}: You also consider this question in your evaluation:
"${inheritedQuestion}"
This trait was inherited because ${topDef.name} has the best track record on the council.`;

  return {
    id: deadMember.id,
    definition: {
      name: newName,
      archetype: baseArchetype,
      color: deadMember.definition.color,
      accessory: deadMember.definition.accessory,
      systemPrompt: mutatedPrompt,
      frameworkQuestions: mutatedQuestions,
    },
    generation: newGeneration,
    lineage: [
      ...deadMember.lineage,
      `${newName}-v${newGeneration} (${baseArchetype} + ${topDef.name} traits)`,
    ],
    stats: {
      wins: 0,
      losses: 0,
      defections: 0,
      totalDecisions: 0,
      overrideMatches: 0,
    },
  };
}
