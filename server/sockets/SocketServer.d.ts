import { ServerOptions, WebSocket } from "ws";
import { Router, SocketActionEvent } from "./Router";
import { IncomingMessage, Server } from "http";
import { Producer } from "pulsar-client";

export interface EmitActionData {
  data: SocketData;
  req: Req;
  properties: SocketProperties;
}
export type SocketData = Buffer[] | Record<string, any> | string | null;
export interface SocketProperties<T = undefined> {
  route: string;
  type?: "json" | "text" | "binary";
  options?: T;
}

export interface SocketOption {
  path?: string;
  server: Server;
  handleUpgrade?: (connection: any, req: Req, next: () => void) => void;
}
export interface SocketConnection extends WebSocket {
  user: any;
  sendAction: (action: string, data: any) => void;
  sessionBroadcast: (action: string, data: any) => void;
  roomBroadcast: (action: string, data: any) => void;
  join: (room: string) => void;
  left: (room: string) => void;
}
export interface ActionPayload {
  action: string;
  data: any;
}
export interface PulsarConnection {
  [name: string]: Producer;
}
export interface Req {
  clientId: string;
  parameters: Record<string, string>;
  user?: any;
}
export interface Client {
  connection: SocketConnection;
  connections: Map<string, Connection[]>;
  req: Req;
}

export type ActionRoute<T = SocketData, F = undefined> = (
  client: Client,
  payload: { data: T; properties: SocketProperties<F> }
) => void;

export type MiddleWare<T = SocketData, F = undefined> = (
  client: Client,
  payload: { data: T; properties: SocketProperties<F> },
  next: () => void
) => void;

type DefaultActionEvent = "auth" | "connection" | "close" | "error" | "message";
type ActionEventName = DefaultActionEvent | string;
