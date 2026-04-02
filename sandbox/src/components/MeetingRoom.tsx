"use client";

import { useRef, useEffect, useCallback } from "react";
import type { CouncilPhase, MemberInfo, MemberPosition, SandboxEvent } from "@/lib/types";
import {
  CANVAS,
  TABLE,
  TABLE_SEATS,
  RESEARCH_STATIONS,
  ISOLATION_PODS,
  GALLOWS,
  SPAWN,
  WANDER_POINTS,
} from "@/lib/types";

interface MeetingRoomProps {
  members: MemberInfo[];
  phase: CouncilPhase;
  positions: Map<string, MemberPosition>;
  votes: Array<{ member: string; option: string; confidence: number; defected: boolean }>;
  reaper: (SandboxEvent & { event: "reaper" }) | null;
  finalPlan: string;
}

// ─── Agent position tracking (persistent across renders) ───

interface AgentAnim {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  activity: string; // emoji/text shown above head
  walkPhase: number; // for leg animation
  idleTimer: number; // frames until next wander
  reconStation: number; // which station they're visiting (-1 = in transit)
  facingRight: boolean;
}

const agentAnims = new Map<string, AgentAnim>();
let lastPhase: CouncilPhase = "idle";
let phaseStartFrame = 0;

function getOrCreateAgent(id: string, startX: number, startY: number): AgentAnim {
  if (!agentAnims.has(id)) {
    agentAnims.set(id, {
      x: startX,
      y: startY,
      targetX: startX,
      targetY: startY,
      activity: "",
      walkPhase: Math.random() * Math.PI * 2,
      idleTimer: Math.floor(Math.random() * 120),
      reconStation: -1,
      facingRight: true,
    });
  }
  return agentAnims.get(id)!;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function moveAgent(agent: AgentAnim, speed: number = 0.03): boolean {
  const dx = agent.targetX - agent.x;
  const dy = agent.targetY - agent.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 2) return false; // arrived

  agent.x = lerp(agent.x, agent.targetX, speed);
  agent.y = lerp(agent.y, agent.targetY, speed);
  agent.walkPhase += 0.15;
  agent.facingRight = dx > 0;
  return true; // still moving
}

// ─── Phase-driven target assignment ───

function assignTargets(
  members: MemberInfo[],
  phase: CouncilPhase,
  frame: number,
  positions: Map<string, MemberPosition>,
  reaperEvent: (SandboxEvent & { event: "reaper" }) | null = null,
) {
  members.forEach((member, i) => {
    const agent = getOrCreateAgent(member.id, SPAWN.x + (i - 1.5) * 80, SPAWN.y);

    switch (phase) {
      case "idle": {
        // Wander randomly
        agent.activity = "";
        agent.idleTimer--;
        if (agent.idleTimer <= 0) {
          const wp = WANDER_POINTS[Math.floor(Math.random() * WANDER_POINTS.length)];
          agent.targetX = wp.x + (Math.random() - 0.5) * 60;
          agent.targetY = wp.y + (Math.random() - 0.5) * 40;
          agent.idleTimer = 120 + Math.floor(Math.random() * 180);
        }
        break;
      }

      case "recon": {
        // Cycle between research stations — each agent visits different ones
        const cycleTime = 90; // frames per station
        const stationIdx = Math.floor(((frame - phaseStartFrame) + i * 30) / cycleTime) % RESEARCH_STATIONS.length;

        if (agent.reconStation !== stationIdx) {
          agent.reconStation = stationIdx;
          const station = RESEARCH_STATIONS[stationIdx];
          agent.targetX = station.x + (i - 1.5) * 30;
          agent.targetY = station.y + 50 + (i % 2) * 25;
        }

        const station = RESEARCH_STATIONS[stationIdx];
        agent.activity = station.label === "WEB SEARCH" ? "🔍"
          : station.label === "DOCS" ? "📄"
          : station.label === "BENCHMARKS" ? "📊"
          : "💻";
        break;
      }

      case "naive_plan": {
        // Gather loosely around table, watching
        const angle = (i / members.length) * Math.PI * 2 - Math.PI / 2;
        agent.targetX = TABLE.x + Math.cos(angle) * (TABLE.rx + 80);
        agent.targetY = TABLE.y + Math.sin(angle) * (TABLE.ry + 60);
        agent.activity = "👀";
        break;
      }

      case "round_1": {
        // Go to isolation pods — separated, can't see each other
        const pod = ISOLATION_PODS[i] ?? ISOLATION_PODS[0];
        agent.targetX = pod.x;
        agent.targetY = pod.y;
        agent.activity = positions.has(member.name) ? "✍️" : "🤔";
        break;
      }

      case "round_2": {
        // Converge on table seats for debate
        const seat = TABLE_SEATS[i] ?? TABLE_SEATS[0];
        agent.targetX = seat.x;
        agent.targetY = seat.y;
        agent.activity = "⚔️";
        break;
      }

      case "voting": {
        // At the table, voting
        const seat = TABLE_SEATS[i] ?? TABLE_SEATS[0];
        agent.targetX = seat.x;
        agent.targetY = seat.y;
        agent.activity = "🗳️";
        break;
      }

      case "verdict": {
        const seat = TABLE_SEATS[i] ?? TABLE_SEATS[0];
        agent.targetX = seat.x;
        agent.targetY = seat.y;
        agent.activity = "⚖️";
        break;
      }

      case "synthesis": {
        // Agents orbit around center, "contributing" to the document
        const orbitAngle = (i / members.length) * Math.PI * 2 + (frame - phaseStartFrame) * 0.003;
        const orbitR = 190;
        agent.targetX = TABLE.x + Math.cos(orbitAngle) * orbitR;
        agent.targetY = TABLE.y + Math.sin(orbitAngle) * (orbitR * 0.5);
        // Cycle through "thinking" emojis
        const thinkCycle = ["🤔", "💭", "✍️", "📝"];
        agent.activity = thinkCycle[Math.floor((frame + i * 20) / 40) % thinkCycle.length];
        break;
      }

      case "reaper": {
        // Non-eliminated stay at table, eliminated drags to gallows
        if (member.name === reaperEvent?.eliminated.name) {
          agent.targetX = GALLOWS.x;
          agent.targetY = GALLOWS.y;
          agent.activity = "💀";
        } else {
          const seat = TABLE_SEATS[i] ?? TABLE_SEATS[0];
          agent.targetX = seat.x;
          agent.targetY = seat.y;
          agent.activity = "😱";
        }
        break;
      }
    }
  });
}

// ─── Drawing functions ───

function drawCrewmate(
  ctx: CanvasRenderingContext2D,
  agent: AgentAnim,
  color: string,
  name: string,
  generation: number,
  isDead: boolean,
  frame: number,
) {
  ctx.save();
  const { x, y } = agent;

  // Walking bob
  const isMoving = Math.abs(agent.targetX - x) > 2 || Math.abs(agent.targetY - y) > 2;
  const bobY = isDead ? 0 : isMoving ? Math.sin(agent.walkPhase * 2) * 3 : Math.sin(frame * 0.04 + x * 0.01) * 1.5;

  const bx = x;
  const by = y + bobY;

  if (isDead) ctx.globalAlpha = 0.25;

  // Shadow
  ctx.fillStyle = "#00000033";
  ctx.beginPath();
  ctx.ellipse(bx, by + 30, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Flip for direction
  ctx.translate(bx, by);
  if (!agent.facingRight) ctx.scale(-1, 1);

  // Backpack
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-28, -8, 12, 24, 4);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-18, -24, 36, 48, [16, 16, 8, 8]);
  ctx.fill();

  // Visor
  ctx.fillStyle = "#a8d8ea";
  ctx.beginPath();
  ctx.ellipse(6, -8, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Visor shine
  ctx.fillStyle = "#d4ecf7";
  ctx.beginPath();
  ctx.ellipse(4, -11, 5, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Legs with walk animation
  ctx.fillStyle = color;
  const legAnim = isMoving ? Math.sin(agent.walkPhase * 2) * 6 : 0;
  ctx.beginPath();
  ctx.roundRect(-14 + legAnim, 22, 12, 12, [0, 0, 4, 4]);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(2 - legAnim, 22, 12, 12, [0, 0, 4, 4]);
  ctx.fill();

  // Dead X eyes
  if (isDead) {
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1, -12); ctx.lineTo(11, -4);
    ctx.moveTo(11, -12); ctx.lineTo(1, -4);
    ctx.stroke();
  }

  // Reset transform for text (always upright)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = isDead ? 0.25 : 1;

  // Activity emoji above head
  if (agent.activity) {
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(agent.activity, bx, by - 36);
  }

  // Name tag
  ctx.fillStyle = isDead ? "#666" : "#ffffff";
  ctx.font = "bold 10px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${name}-v${generation}`, bx, by + 46);

  ctx.restore();
}

function drawMap(ctx: CanvasRenderingContext2D, frame: number, phase: CouncilPhase) {
  // ─── Floor ───
  ctx.fillStyle = CANVAS.BG_COLOR;
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  // Tile grid
  ctx.strokeStyle = "#161630";
  ctx.lineWidth = 0.5;
  for (let gx = 0; gx < CANVAS.WIDTH; gx += 48) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CANVAS.HEIGHT); ctx.stroke();
  }
  for (let gy = 0; gy < CANVAS.HEIGHT; gy += 48) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CANVAS.WIDTH, gy); ctx.stroke();
  }

  // ─── Walls ───
  ctx.fillStyle = "#1a1a3a";
  ctx.fillRect(0, 0, CANVAS.WIDTH, 60); // top wall
  ctx.fillStyle = "#141428";
  ctx.fillRect(0, 55, CANVAS.WIDTH, 4); // wall trim

  // ─── Research stations ───
  RESEARCH_STATIONS.forEach((station, i) => {
    const active = phase === "recon";

    // Desk
    ctx.fillStyle = active ? "#2a2a4a" : "#1e1e38";
    ctx.strokeStyle = active ? "#4444aa" : "#2a2a4a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(station.x - 40, station.y - 15, 80, 30, 4);
    ctx.fill();
    ctx.stroke();

    // Screen
    const screenGlow = active ? Math.sin(frame * 0.08 + i) * 0.3 + 0.7 : 0.3;
    ctx.fillStyle = active
      ? `rgba(68, 200, 255, ${screenGlow})`
      : "rgba(40, 40, 80, 0.5)";
    ctx.beginPath();
    ctx.roundRect(station.x - 20, station.y - 22, 40, 20, 2);
    ctx.fill();

    // Screen text (scrolling when active)
    if (active) {
      ctx.fillStyle = "#00ff88";
      ctx.font = "7px 'Courier New', monospace";
      ctx.textAlign = "center";
      const scrollOffset = (frame * 0.5) % 30;
      ctx.save();
      ctx.beginPath();
      ctx.rect(station.x - 18, station.y - 20, 36, 16);
      ctx.clip();
      for (let line = 0; line < 4; line++) {
        const text = ["searching...", "fetching data", "parsing docs", "analyzing..."][(line + Math.floor(frame / 60)) % 4];
        ctx.fillText(text, station.x, station.y - 16 + line * 6 + (scrollOffset % 6));
      }
      ctx.restore();
    }

    // Label
    ctx.fillStyle = active ? "#6666cc" : "#333355";
    ctx.font = "bold 8px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(station.label, station.x, station.y + 28);
  });

  // ─── Isolation pods (visible during Round 1) ───
  ISOLATION_PODS.forEach((pod, i) => {
    const active = phase === "round_1";

    // Pod outline
    ctx.strokeStyle = active ? "#cc333388" : "#222244";
    ctx.lineWidth = active ? 2 : 1;
    ctx.setLineDash(active ? [6, 4] : [3, 6]);
    ctx.beginPath();
    ctx.roundRect(pod.x - 55, pod.y - 50, 110, 100, 8);
    ctx.stroke();
    ctx.setLineDash([]);

    if (active) {
      // "ISOLATED" label
      ctx.fillStyle = "#cc333366";
      ctx.font = "bold 8px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText("ISOLATED", pod.x, pod.y - 55);

      // Lock icon
      ctx.fillText("🔒", pod.x, pod.y + 55);
    }
  });

  // ─── Meeting table ───
  // Table shadow
  ctx.fillStyle = "#00000044";
  ctx.beginPath();
  ctx.ellipse(TABLE.x, TABLE.y + 8, TABLE.rx + 6, TABLE.ry + 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Table surface
  const grad = ctx.createRadialGradient(TABLE.x, TABLE.y - 10, 20, TABLE.x, TABLE.y, TABLE.rx);
  grad.addColorStop(0, "#cc4444");
  grad.addColorStop(1, "#881111");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(TABLE.x, TABLE.y, TABLE.rx, TABLE.ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Table rim
  ctx.strokeStyle = "#660000";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Emergency button
  const buttonActive = phase === "round_1" || phase === "round_2" || phase === "voting";
  const pulse = buttonActive ? Math.sin(frame * 0.1) * 4 : 0;
  ctx.fillStyle = buttonActive ? "#ff2222" : "#991111";
  ctx.beginPath();
  ctx.arc(TABLE.x, TABLE.y, 16 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#660000";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", TABLE.x, TABLE.y);
  ctx.textBaseline = "alphabetic";

  // ─── Gallows ───
  const gx = GALLOWS.x;
  const gy = GALLOWS.y;
  const gallowsActive = phase === "reaper";

  // Platform
  ctx.fillStyle = gallowsActive ? "#3a2a1a" : "#1e1a14";
  ctx.fillRect(gx - 50, gy + 10, 100, 8);

  // Vertical post
  ctx.fillStyle = gallowsActive ? "#4a3a2a" : "#2a2420";
  ctx.fillRect(gx - 35, gy - 60, 8, 70);

  // Horizontal beam
  ctx.fillRect(gx - 35, gy - 64, 60, 6);

  // Support brace
  ctx.strokeStyle = gallowsActive ? "#4a3a2a" : "#2a2420";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(gx - 27, gy - 40);
  ctx.lineTo(gx - 5, gy - 58);
  ctx.stroke();

  // Rope
  ctx.strokeStyle = gallowsActive ? "#aa8844" : "#554422";
  ctx.lineWidth = 2;
  const ropeSwing = gallowsActive ? Math.sin(frame * 0.05) * 3 : 0;
  ctx.beginPath();
  ctx.moveTo(gx + 15, gy - 58);
  ctx.lineTo(gx + 15 + ropeSwing, gy - 35);
  ctx.stroke();

  // Noose
  ctx.beginPath();
  ctx.arc(gx + 15 + ropeSwing, gy - 30, 6, 0, Math.PI * 2);
  ctx.stroke();

  // Label
  ctx.fillStyle = gallowsActive ? "#ff4444" : "#333";
  ctx.font = "bold 9px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("THE GALLOWS", gx, gy + 30);

  // ─── Data conduits (decorative lines connecting stations) ───
  if (phase === "recon") {
    ctx.strokeStyle = "#4444aa22";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    for (let si = 0; si < RESEARCH_STATIONS.length - 1; si++) {
      const s1 = RESEARCH_STATIONS[si];
      const s2 = RESEARCH_STATIONS[si + 1];
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y + 15);
      ctx.lineTo(s2.x, s2.y + 15);
      ctx.stroke();

      // Traveling dot
      const progress = ((frame * 2 + si * 40) % 200) / 200;
      const dotX = lerp(s1.x, s2.x, progress);
      const dotY = lerp(s1.y + 15, s2.y + 15, progress);
      ctx.fillStyle = "#44aaff";
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.setLineDash([]);
  }
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
) {
  const maxWidth = 170;
  ctx.font = "9px 'Courier New', monospace";
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth - 14 && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  const visibleLines = lines.slice(0, 3);

  const lineHeight = 12;
  const bubbleH = visibleLines.length * lineHeight + 10;
  const bubbleW = maxWidth;
  const bx = Math.max(5, Math.min(x - bubbleW / 2, CANVAS.WIDTH - bubbleW - 5));
  const by = y - bubbleH - 48;

  ctx.fillStyle = "#0f0f23ee";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, bubbleW, bubbleH, 6);
  ctx.fill();
  ctx.stroke();

  // Tail
  ctx.beginPath();
  ctx.moveTo(x - 5, by + bubbleH);
  ctx.lineTo(x, by + bubbleH + 7);
  ctx.lineTo(x + 5, by + bubbleH);
  ctx.fillStyle = "#0f0f23ee";
  ctx.fill();

  ctx.fillStyle = "#bbbbbb";
  ctx.textAlign = "left";
  visibleLines.forEach((line, i) => {
    ctx.fillText(line, bx + 7, by + 12 + i * lineHeight);
  });
}

function drawPhaseTitle(ctx: CanvasRenderingContext2D, phase: CouncilPhase, frame: number) {
  if (phase === "idle") return;

  const labels: Record<CouncilPhase, string> = {
    idle: "",
    recon: "RECON — GATHERING INTEL",
    naive_plan: "GENERATING BASELINE PLAN...",
    round_1: "EMERGENCY MEETING — ISOLATION ROUND",
    round_2: "CHALLENGE ROUND — REBUTTALS",
    voting: "FINAL VOTES",
    verdict: "VERDICT REACHED",
    synthesis: "SYNTHESIZING FINAL PLAN...",
    reaper: "REAPER ACTIVATED",
  };

  const label = labels[phase];
  const isReaper = phase === "reaper";

  // Background bar
  ctx.fillStyle = isReaper ? "#33000088" : "#00000066";
  ctx.fillRect(0, 62, CANVAS.WIDTH, 28);

  // Text
  ctx.fillStyle = isReaper ? "#ff3333" : "#ffffff";
  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(label, CANVAS.WIDTH / 2, 81);

  // Animated progress dots
  if (phase === "recon" || phase === "naive_plan" || phase === "synthesis") {
    const dots = ".".repeat((Math.floor(frame / 20) % 4));
    ctx.fillStyle = "#666";
    ctx.textAlign = "left";
    const textW = ctx.measureText(label).width;
    ctx.fillText(dots, CANVAS.WIDTH / 2 + textW / 2 + 2, 81);
  }
}

// ─── Main component ───

export function MeetingRoom({ members, phase, positions, votes, reaper, finalPlan }: MeetingRoomProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    frameRef.current++;
    const frame = frameRef.current;

    // Detect phase change
    if (phase !== lastPhase) {
      lastPhase = phase;
      phaseStartFrame = frame;
    }

    // Assign movement targets based on phase
    assignTargets(members, phase, frame, positions, reaper);

    // Move all agents toward their targets
    members.forEach((member) => {
      const agent = agentAnims.get(member.id);
      if (agent) {
        const speed = phase === "recon" ? 0.04 : phase === "reaper" ? 0.015 : 0.035;
        moveAgent(agent, speed);
      }
    });

    // ─── Draw ───
    drawMap(ctx, frame, phase);
    drawPhaseTitle(ctx, phase, frame);

    // Draw crewmates (sorted by Y for depth)
    const sortedMembers = [...members].sort((a, b) => {
      const aa = agentAnims.get(a.id);
      const ab = agentAnims.get(b.id);
      return (aa?.y ?? 0) - (ab?.y ?? 0);
    });

    sortedMembers.forEach((member, _i) => {
      const agent = agentAnims.get(member.id);
      if (!agent) return;

      const isEliminated = phase === "reaper" && reaper?.eliminated.name === member.name;
      drawCrewmate(ctx, agent, member.color, member.name, member.generation, isEliminated, frame);

      // Speech bubbles during round 1 and round 2
      if (positions.has(member.name) && (phase === "round_1" || phase === "round_2")) {
        const pos = positions.get(member.name)!;
        const text = pos.critique.slice(0, 100) + (pos.critique.length > 100 ? "..." : "");
        drawSpeechBubble(ctx, agent.x, agent.y, text, member.color);
      }

      // Vote labels during voting
      const memberVote = votes.find((v) => v.member === member.name);
      if (memberVote && (phase === "voting" || phase === "verdict")) {
        ctx.fillStyle = memberVote.defected ? "#ff6600" : "#00ff66";
        ctx.font = "bold 10px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          `${memberVote.option.slice(0, 20)} (${(memberVote.confidence * 100).toFixed(0)}%)`,
          agent.x,
          agent.y + 56,
        );
        if (memberVote.defected) {
          ctx.fillStyle = "#ff6600";
          ctx.font = "bold 9px 'Courier New', monospace";
          ctx.fillText("⚠ DEFECTED", agent.x, agent.y + 68);
        }
      }
    });

    // Synthesis overlay — document being assembled
    if (phase === "synthesis" || (phase === "idle" && finalPlan)) {
      const synthFrame = frame - phaseStartFrame;
      const cx = TABLE.x;
      const cy = TABLE.y;

      // Contribution lines from each agent to center document
      if (phase === "synthesis") {
        members.forEach((member) => {
          const agent = agentAnims.get(member.id);
          if (!agent) return;

          // Pulsing line from agent to center
          const pulse = (Math.sin(synthFrame * 0.08 + agent.x * 0.01) + 1) / 2;
          ctx.strokeStyle = member.color + Math.floor(pulse * 150 + 50).toString(16).padStart(2, "0");
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(agent.x, agent.y);
          ctx.lineTo(cx, cy);
          ctx.stroke();
          ctx.setLineDash([]);

          // Traveling data particles along the line
          const particleCount = 3;
          for (let p = 0; p < particleCount; p++) {
            const t = ((synthFrame * 0.02 + p / particleCount) % 1);
            const px = lerp(agent.x, cx, t);
            const py = lerp(agent.y, cy, t);
            ctx.fillStyle = member.color;
            ctx.globalAlpha = 1 - t * 0.5;
            ctx.beginPath();
            ctx.arc(px, py, 3 - t * 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        });
      }

      // Central document panel
      const docW = 320;
      const docH = 200;
      const docX = cx - docW / 2;
      const docY = cy - docH / 2;

      // Document shadow
      ctx.fillStyle = "#00000066";
      ctx.beginPath();
      ctx.roundRect(docX + 4, docY + 4, docW, docH, 6);
      ctx.fill();

      // Document background
      const docGrad = ctx.createLinearGradient(docX, docY, docX, docY + docH);
      docGrad.addColorStop(0, "#141428");
      docGrad.addColorStop(1, "#0a0a1e");
      ctx.fillStyle = docGrad;
      ctx.beginPath();
      ctx.roundRect(docX, docY, docW, docH, 6);
      ctx.fill();

      // Document border (glowing during synthesis)
      if (phase === "synthesis") {
        const glow = Math.sin(synthFrame * 0.06) * 0.3 + 0.7;
        ctx.strokeStyle = `rgba(0, 255, 100, ${glow})`;
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
      }
      ctx.stroke();

      // Document header
      ctx.fillStyle = "#00ff6688";
      ctx.fillRect(docX, docY, docW, 24);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px 'Courier New', monospace";
      ctx.textAlign = "left";
      ctx.fillText("FINAL PLAN v1", docX + 8, docY + 16);

      // Status indicator
      if (phase === "synthesis") {
        const dots = ".".repeat((Math.floor(synthFrame / 15) % 4));
        ctx.fillStyle = "#00ff66";
        ctx.textAlign = "right";
        ctx.fillText(`COMPILING${dots}`, docX + docW - 8, docY + 16);
      } else {
        ctx.fillStyle = "#00ff66";
        ctx.textAlign = "right";
        ctx.fillText("COMPLETE", docX + docW - 8, docY + 16);
      }

      // Document content — show plan text typing in
      const planText = finalPlan || "Synthesizing council positions...";
      const visibleChars = phase === "synthesis"
        ? Math.min(planText.length, Math.floor(synthFrame * 1.5))
        : planText.length;
      const visibleText = planText.slice(0, visibleChars);

      // Parse into lines that fit the document
      ctx.font = "9px 'Courier New', monospace";
      ctx.textAlign = "left";
      const maxLineW = docW - 20;
      const docLines: Array<{ text: string; color: string }> = [];
      for (const rawLine of visibleText.split("\n")) {
        // Color headers green, risks red, normal white
        let color = "#999";
        if (rawLine.startsWith("#")) color = "#00ff66";
        else if (rawLine.includes("Risk") || rawLine.includes("⚠")) color = "#ff6644";
        else if (rawLine.startsWith("-") || rawLine.startsWith("*")) color = "#aaa";
        else if (rawLine.includes("GHOST")) color = "#7B68EE";
        else if (rawLine.includes("SCOUT")) color = "#00CC00";
        else if (rawLine.includes("RAZOR")) color = "#FF4444";
        else if (rawLine.includes("BISHOP")) color = "#FFD700";

        // Word wrap
        const words = rawLine.split(" ");
        let current = "";
        for (const word of words) {
          const test = current ? `${current} ${word}` : word;
          if (ctx.measureText(test).width > maxLineW && current) {
            docLines.push({ text: current, color });
            current = word;
          } else {
            current = test;
          }
        }
        if (current) docLines.push({ text: current, color });
        else docLines.push({ text: "", color }); // blank line
      }

      // Render visible lines with scroll
      const lineH = 11;
      const maxVisibleLines = Math.floor((docH - 34) / lineH);
      const scrollOffset = Math.max(0, docLines.length - maxVisibleLines);
      const startLine = phase === "synthesis" ? scrollOffset : 0;

      ctx.save();
      ctx.beginPath();
      ctx.rect(docX + 2, docY + 26, docW - 4, docH - 28);
      ctx.clip();

      docLines.slice(startLine, startLine + maxVisibleLines).forEach((line, i) => {
        ctx.fillStyle = line.color;
        ctx.fillText(line.text, docX + 10, docY + 36 + i * lineH);
      });

      // Blinking cursor at the end during synthesis
      if (phase === "synthesis" && Math.floor(synthFrame / 15) % 2 === 0) {
        const lastLineIdx = Math.min(docLines.length - startLine, maxVisibleLines) - 1;
        if (lastLineIdx >= 0) {
          const lastLine = docLines[startLine + lastLineIdx];
          const cursorX = docX + 10 + ctx.measureText(lastLine.text).width + 2;
          const cursorY = docY + 28 + lastLineIdx * lineH;
          ctx.fillStyle = "#00ff66";
          ctx.fillRect(cursorX, cursorY, 6, lineH);
        }
      }
      ctx.restore();

      // Progress bar at bottom of document
      if (phase === "synthesis") {
        const progress = Math.min(1, visibleChars / Math.max(1, planText.length));
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(docX + 8, docY + docH - 12, docW - 16, 6);
        ctx.fillStyle = "#00ff66";
        ctx.fillRect(docX + 8, docY + docH - 12, (docW - 16) * progress, 6);
      }
    }

    // Reaper overlay
    if (phase === "reaper" && reaper) {
      // Red vignette
      const vignetteGrad = ctx.createRadialGradient(
        CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2, 200,
        CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2, CANVAS.WIDTH / 2,
      );
      vignetteGrad.addColorStop(0, "transparent");
      vignetteGrad.addColorStop(1, "rgba(80, 0, 0, 0.4)");
      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

      // Elimination text
      const flash = Math.sin(frame * 0.12) > 0;
      if (flash) {
        ctx.fillStyle = "#ff0000cc";
        ctx.font = "bold 22px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          `${reaper.eliminated.name}-v${reaper.eliminated.generation} WAS ELIMINATED`,
          CANVAS.WIDTH / 2,
          CANVAS.HEIGHT - 50,
        );
      }
      ctx.fillStyle = "#888";
      ctx.font = "12px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        `Win rate: ${(reaper.eliminated.winRate * 100).toFixed(0)}%`,
        CANVAS.WIDTH / 2,
        CANVAS.HEIGHT - 28,
      );
    }

    rafRef.current = requestAnimationFrame(render);
  }, [members, phase, positions, votes, reaper, finalPlan]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS.WIDTH}
      height={CANVAS.HEIGHT}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}
