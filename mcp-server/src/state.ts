import { WebSocketServer, WebSocket } from "ws";
import type { CouncilPhase, MemberState, DecisionRecord, SandboxEvent } from "./types.js";
import { createDefaultMembers } from "./members.js";

export class CouncilState {
  phase: CouncilPhase = "idle";
  members: MemberState[] = createDefaultMembers();
  history: DecisionRecord[] = [];
  decisionCounter = 0;

  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  startWebSocketServer(port: number = 3099): void {
    this.wss = new WebSocketServer({ port });
    console.error(`[council] Sandbox WebSocket server on ws://localhost:${port}`);

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);
      console.error(`[council] Sandbox client connected (${this.clients.size} total)`);

      // Send current state on connect
      ws.send(
        JSON.stringify({
          event: "state_sync",
          phase: this.phase,
          members: this.members.map((m) => ({
            id: m.id,
            name: m.definition.name,
            color: m.definition.color,
            archetype: m.definition.archetype,
            accessory: m.definition.accessory,
            generation: m.generation,
            lineage: m.lineage,
            stats: m.stats,
          })),
          historyCount: this.history.length,
        }),
      );

      ws.on("close", () => {
        this.clients.delete(ws);
        console.error(`[council] Sandbox client disconnected (${this.clients.size} total)`);
      });
    });
  }

  broadcast(event: SandboxEvent): void {
    const data = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  setPhase(phase: CouncilPhase): void {
    this.phase = phase;
    this.broadcast({ event: "phase_change", phase });
  }

  getMember(id: string): MemberState | undefined {
    return this.members.find((m) => m.id === id);
  }

  replaceMember(deadId: string, newMember: MemberState): void {
    const idx = this.members.findIndex((m) => m.id === deadId);
    if (idx !== -1) {
      this.members[idx] = newMember;
    }
  }

  recordDecision(record: DecisionRecord): void {
    this.history.push(record);
    this.decisionCounter++;
  }

  nextDecisionId(): string {
    return `decision-${String(this.decisionCounter + 1).padStart(3, "0")}`;
  }

  shutdown(): void {
    this.wss?.close();
  }
}
