import type { BotDifficulty, SanguoAction } from "./sanguoBot";
import type { SanguoFaction, SanguoState } from "./sanguoRules";
export type RoomSeat = { kind: "human" | "bot" | "open"; playerId?: string; botActive?: boolean };
export type RoomPlayer = { id: string; name: string; faction: SanguoFaction; ready: boolean; connected: boolean; resigned: boolean; disconnectedAt: number | null };
export type SanguoRoom = { gameId: "sanguo-qi"; roomCode: string; status: "waiting" | "playing" | "finished" | "cancelled"; visibility: string; hostId: string; revision: number; humanCount: number; difficulty: BotDifficulty; bannermen: boolean; gameState: SanguoState; seats: Record<SanguoFaction, RoomSeat>; players: RoomPlayer[] };
export type RoomSummary = { roomCode: string; host: string; playerCount: number; humanCount: number; difficulty: BotDifficulty; bannermen: boolean };
export type SeatCredentials = { roomCode: string; playerId: string; token: string };
export type OnlineAction = SanguoAction | { type: "resign" };

export function newSeatToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join(""); }
export const inviteUrl = (roomCode: string) => {
  const url = new URL(window.location.href);
  url.search = new URLSearchParams({ game: "heritage-arcade", table: "sanguo", room: roomCode }).toString();
  return url.toString();
};
const storageKey = (roomCode: string) => `arctic-sanguo-seat:${roomCode}`;
export function readSeat(roomCode: string): SeatCredentials | null {
  try { const value = JSON.parse(localStorage.getItem(storageKey(roomCode)) || "null"); return value?.roomCode === roomCode && typeof value.playerId === "string" && /^[a-f0-9]{64}$/.test(value.token) ? value : null; } catch { return null; }
}
export function rememberSeat(seat: SeatCredentials) { try { localStorage.setItem(storageKey(seat.roomCode), JSON.stringify(seat)); } catch { /* Play can continue in this tab. */ } }
export function forgetSeat(roomCode: string) { try { localStorage.removeItem(storageKey(roomCode)); } catch { /* No saved seat. */ } }

/** Dedicated connection: concurrent requests share one handshake, never queue moves offline. */
export class SanguoClient {
  socket: WebSocket | null = null;
  connecting: Promise<WebSocket> | null = null;
  pending = new Map<string, { resolve: (value: any) => void; reject: (reason: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  serial = 0;
  onPacket: (packet: any) => void = () => {};
  onStatus: (connected: boolean) => void = () => {};
  async connect(): Promise<WebSocket> {
    if (this.socket?.readyState === WebSocket.OPEN) return this.socket;
    if (this.connecting) return this.connecting;
    const url = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? "ws://localhost:10000" : "");
    if (!url) throw new Error("Online rooms are unavailable: the lobby address has not been configured.");
    const promise = new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(url); this.socket = ws;
      const timeout = setTimeout(() => { ws.close(); reject(new Error("The lobby did not respond. Try again.")); }, 12000);
      ws.onopen = () => { clearTimeout(timeout); this.onStatus(true); resolve(ws); };
      ws.onerror = () => { clearTimeout(timeout); reject(new Error("Could not connect to the lobby. Please retry.")); };
      ws.onclose = () => {
        clearTimeout(timeout);
        const current = this.socket === ws;
        if (current) { this.socket = null; this.onStatus(false); }
        reject(new Error("The connection closed."));
        if (current) {
          for (const item of this.pending.values()) { clearTimeout(item.timer); item.reject(new Error("Connection lost. Reconnecting to your room…")); }
          this.pending.clear();
        }
      };
      ws.onmessage = event => {
        let packet;
        try { packet = JSON.parse(event.data); } catch { return; }
        const item = this.pending.get(packet.requestId);
        if (item) {
          clearTimeout(item.timer); this.pending.delete(packet.requestId);
          packet.type === "error" ? item.reject(new Error(packet.payload?.message || "Could not complete this action.")) : item.resolve(packet.payload);
        }
        this.onPacket(packet);
      };
    });
    this.connecting = promise;
    try { return await promise; } finally { if (this.connecting === promise) this.connecting = null; }
  }
  async request<T = any>(type: string, payload: object = {}): Promise<T> {
    const ws = await this.connect();
    const requestId = `sg_${++this.serial}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(requestId); reject(new Error("The server did not confirm the action. Refreshing your room.")); }, 12000);
      this.pending.set(requestId, { resolve, reject, timer });
      try { ws.send(JSON.stringify({ type, requestId, payload })); } catch { clearTimeout(timer); this.pending.delete(requestId); reject(new Error("Connection lost. Please retry.")); }
    });
  }
  disconnect() {
    const ws = this.socket; this.socket = null; this.connecting = null; ws?.close();
    for (const item of this.pending.values()) { clearTimeout(item.timer); item.reject(new Error("Connection closed.")); }
    this.pending.clear(); this.onStatus(false);
  }
  close() { this.onStatus = () => {}; this.onPacket = () => {}; this.disconnect(); }
}
