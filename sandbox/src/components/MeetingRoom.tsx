"use client";

import { useRef, useEffect, useCallback } from "react";
import type { CouncilPhase, MemberInfo, MemberPosition, SandboxEvent } from "@/lib/types";
import { CANVAS, SEAT_POSITIONS } from "@/lib/types";

interface MeetingRoomProps {
  members: MemberInfo[];
  phase: CouncilPhase;
  positions: Map<string, MemberPosition>;
  votes: Array<{ member: string; option: string; confidence: number; defected: boolean }>;
  reaper: (SandboxEvent & { event: "reaper" }) | null;
}

// Among Us crewmate proportions (simplified)
function drawCrewmate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  name: string,
  state: "idle" | "speaking" | "voting" | "dead",
  generation: number,
  animFrame: number,
) {
  ctx.save();

  // Idle bob animation
  const bobY = state === "dead" ? 0 : Math.sin(animFrame * 0.05 + x) * 2;

  // Body (Among Us shape: rounded rectangle with visor)
  const bx = x;
  const by = y + bobY;

  if (state === "dead") {
    ctx.globalAlpha = 0.3;
  }

  // Backpack
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(bx - 28, by - 8, 12, 24, 4);
  ctx.fill();

  // Main body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(bx - 18, by - 24, 36, 48, [16, 16, 8, 8]);
  ctx.fill();

  // Visor
  ctx.fillStyle = "#a8d8ea";
  ctx.beginPath();
  ctx.ellipse(bx + 6, by - 8, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Visor shine
  ctx.fillStyle = "#d4ecf7";
  ctx.beginPath();
  ctx.ellipse(bx + 4, by - 11, 5, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = color;
  const legOffset = state === "idle" ? Math.sin(animFrame * 0.08) * 2 : 0;
  // Left leg
  ctx.beginPath();
  ctx.roundRect(bx - 14, by + 22, 12, 12, [0, 0, 4, 4]);
  ctx.fill();
  // Right leg
  ctx.beginPath();
  ctx.roundRect(bx + 2 + legOffset, by + 22, 12, 12, [0, 0, 4, 4]);
  ctx.fill();

  // Dead X eyes
  if (state === "dead") {
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + 1, by - 12);
    ctx.lineTo(bx + 11, by - 4);
    ctx.moveTo(bx + 11, by - 12);
    ctx.lineTo(bx + 1, by - 4);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  // Name tag
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${name}-v${generation}`, bx, by + 48);

  ctx.restore();
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
) {
  const maxWidth = 180;
  ctx.font = "10px 'Courier New', monospace";
  const lines = wrapText(ctx, text, maxWidth - 16);
  const lineHeight = 13;
  const bubbleH = lines.length * lineHeight + 12;
  const bubbleW = maxWidth;
  const bx = x - bubbleW / 2;
  const by = y - bubbleH - 30;

  // Bubble background
  ctx.fillStyle = "#1a1a2eee";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bx, by, bubbleW, bubbleH, 8);
  ctx.fill();
  ctx.stroke();

  // Tail
  ctx.beginPath();
  ctx.moveTo(x - 6, by + bubbleH);
  ctx.lineTo(x, by + bubbleH + 8);
  ctx.lineTo(x + 6, by + bubbleH);
  ctx.fillStyle = "#1a1a2eee";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();

  // Text
  ctx.fillStyle = "#cccccc";
  ctx.textAlign = "left";
  lines.forEach((line, i) => {
    ctx.fillText(line, bx + 8, by + 14 + i * lineHeight);
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4); // Max 4 lines in a bubble
}

function drawTable(ctx: CanvasRenderingContext2D, animFrame: number) {
  const { TABLE_X, TABLE_Y, TABLE_RX, TABLE_RY } = CANVAS;

  // Table shadow
  ctx.fillStyle = "#00000044";
  ctx.beginPath();
  ctx.ellipse(TABLE_X, TABLE_Y + 8, TABLE_RX + 4, TABLE_RY + 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Table surface
  const grad = ctx.createRadialGradient(TABLE_X, TABLE_Y, 20, TABLE_X, TABLE_Y, TABLE_RX);
  grad.addColorStop(0, "#cc4444");
  grad.addColorStop(1, "#881111");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(TABLE_X, TABLE_Y, TABLE_RX, TABLE_RY, 0, 0, Math.PI * 2);
  ctx.fill();

  // Table border
  ctx.strokeStyle = "#661111";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Emergency button in center
  const pulse = Math.sin(animFrame * 0.06) * 3;
  ctx.fillStyle = "#ff2222";
  ctx.beginPath();
  ctx.arc(TABLE_X, TABLE_Y, 18 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", TABLE_X, TABLE_Y);
}

function drawGallowsOutline(ctx: CanvasRenderingContext2D) {
  const gx = CANVAS.GALLOWS_X;
  const gy = CANVAS.GALLOWS_Y;

  ctx.strokeStyle = "#444444";
  ctx.lineWidth = 3;

  // Base
  ctx.beginPath();
  ctx.moveTo(gx - 30, gy);
  ctx.lineTo(gx + 30, gy);
  ctx.stroke();

  // Vertical
  ctx.beginPath();
  ctx.moveTo(gx - 10, gy);
  ctx.lineTo(gx - 10, gy - 60);
  ctx.stroke();

  // Horizontal beam
  ctx.beginPath();
  ctx.moveTo(gx - 10, gy - 60);
  ctx.lineTo(gx + 20, gy - 60);
  ctx.stroke();

  // Rope
  ctx.strokeStyle = "#886644";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(gx + 20, gy - 60);
  ctx.lineTo(gx + 20, gy - 45);
  ctx.stroke();
}

export function MeetingRoom({ members, phase, positions, votes, reaper }: MeetingRoomProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef(0);
  const rafRef = useRef<number>(0);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    animFrameRef.current++;
    const frame = animFrameRef.current;

    // Clear
    ctx.fillStyle = CANVAS.BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Floor pattern (subtle grid)
    ctx.strokeStyle = "#1f1f3a";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw table
    drawTable(ctx, frame);

    // Draw gallows outline
    drawGallowsOutline(ctx);

    // Draw crewmates at their seats
    members.forEach((member, i) => {
      const seat = SEAT_POSITIONS[i] ?? { x: 300 + i * 100, y: 300 };
      const hasPosition = positions.has(member.name);
      const hasVoted = votes.some((v) => v.member === member.name);
      const isReaped = reaper?.eliminated.name === member.name;

      let crewState: "idle" | "speaking" | "voting" | "dead" = "idle";
      if (isReaped) crewState = "dead";
      else if (hasVoted) crewState = "voting";
      else if (hasPosition) crewState = "speaking";

      drawCrewmate(ctx, seat.x, seat.y, member.color, member.name, crewState, member.generation, frame);

      // Speech bubble for Round 1 positions
      if (hasPosition && (phase === "round_1" || phase === "round_2")) {
        const pos = positions.get(member.name)!;
        const bubbleText = pos.critique.slice(0, 120) + (pos.critique.length > 120 ? "..." : "");
        drawSpeechBubble(ctx, seat.x, seat.y - 24, bubbleText, member.color);
      }

      // Vote indicator
      if (hasVoted && phase === "voting") {
        const vote = votes.find((v) => v.member === member.name)!;
        ctx.fillStyle = vote.defected ? "#ff6600" : "#00ff66";
        ctx.font = "bold 12px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          `${vote.option} (${(vote.confidence * 100).toFixed(0)}%)`,
          seat.x,
          seat.y + 60,
        );
        if (vote.defected) {
          ctx.fillStyle = "#ff6600";
          ctx.fillText("⚠ DEFECTED", seat.x, seat.y + 74);
        }
      }
    });

    // Phase title
    if (phase !== "idle") {
      const phaseLabels: Record<CouncilPhase, string> = {
        idle: "",
        recon: "RECON PHASE",
        naive_plan: "GENERATING BASELINE PLAN...",
        round_1: "⚡ EMERGENCY MEETING — ROUND 1",
        round_2: "ROUND 2 — CHALLENGES",
        voting: "FINAL VOTES",
        verdict: "VERDICT",
        synthesis: "SYNTHESIZING PLAN...",
        reaper: "💀 REAPER ACTIVATED",
      };

      const label = phaseLabels[phase];
      ctx.fillStyle = phase === "reaper" ? "#ff0000" : "#ffffff";
      ctx.font = "bold 20px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, canvas.width / 2, 40);

      // Animated underline
      const textW = ctx.measureText(label).width;
      const lineProgress = Math.min(1, (frame % 60) / 30);
      ctx.strokeStyle = phase === "reaper" ? "#ff0000" : "#cc3333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - textW / 2, 46);
      ctx.lineTo(canvas.width / 2 - textW / 2 + textW * lineProgress, 46);
      ctx.stroke();
    }

    // Reaper animation overlay
    if (phase === "reaper" && reaper) {
      const flash = Math.sin(frame * 0.15) > 0;
      if (flash) {
        ctx.fillStyle = "#ff000015";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.fillStyle = "#ff0000";
      ctx.font = "bold 16px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        `${reaper.eliminated.name}-v${reaper.eliminated.generation} WAS ELIMINATED`,
        canvas.width / 2,
        canvas.height - 30,
      );
      ctx.fillStyle = "#888888";
      ctx.font = "12px 'Courier New', monospace";
      ctx.fillText(
        `Win rate: ${(reaper.eliminated.winRate * 100).toFixed(0)}%`,
        canvas.width / 2,
        canvas.height - 12,
      );
    }

    rafRef.current = requestAnimationFrame(render);
  }, [members, phase, positions, votes, reaper]);

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
