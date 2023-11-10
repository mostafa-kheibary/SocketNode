import { WebSocket } from "ws";
import { Server } from "http";
import internal from "stream";

export interface WebSocketProperties<T = undefined> {
  type?: "json" | "text" | "binary";
  options?: T;
}
export type WebsocketResponse = Buffer[] | Record<string, any> | string | null;

export interface WebsocketOptions {
  path?: string;
  server: Server;
  handleUpgrade?: (socket: internal.Duplex, req: Req, next: () => void) => void;
}
export interface WebSocketConnection extends WebSocket {
  sendAction: (action: string, data: any) => void;
  sessionBroadcast: (action: string, data: any) => void;
  roomBroadcast: (action: string, data: any) => void;
  join: (room: string) => void;
  left: (room: string) => void;
}
