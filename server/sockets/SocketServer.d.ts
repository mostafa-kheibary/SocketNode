import { ServerOptions, WebSocket } from "ws";
import { User } from "./User";
import { Router, SocketActionEvent } from "../sockets/EventRouter";
import { IncomingMessage, Server } from "http";
import { Producer } from "pulsar-client";

export interface EmitActionData {
  data: SocketData;
  meta: MetaData;
  properties: SocketProperties;
}
export type SocketData = Buffer[] | Record<string, any> | string | null;
export interface SocketProperties<T = undefined> {
  route: string;
  type?: "json" | "text" | "binary";
  options?: T;
}

export interface SocketOption {
  auth?: boolean;
  router: Router;
  server: Server;
  path: string;
  authenticate?: (token: string) => Promise;
}
export interface SocketConnection extends WebSocket {
  user: User;
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
export interface Connection {
  sid: string;
  user: User;
  connection: SocketConnection;
  producers: PulsarConnection;
}
export interface MetaData {
  sid: string;
  user: User;
}
export interface Client extends Connection {
  connections: Map<string, Connection[]>;
}

export type ActionRoute<T = SocketData, F = undefined> = (
  client: Client,
  payload: { data: T; properties: SocketProperties<F> }
) => void;

type DefaultActionEvent = "auth" | "connection" | "close" | "error" | "message";
type ActionEventName = DefaultActionEvent | string;
