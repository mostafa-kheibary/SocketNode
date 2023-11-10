import { WebSocketConnection } from "./Server/Connection";
import type { WebsocketResponse, WebSocketProperties } from "./types/SocketServer";

export interface Req {
  clientId: string;
  parameters: Record<string, string>;
  user?: any;
  // ...
}
export interface Payload<T, F> {
  data: T;
  properties: WebSocketProperties<F>;
}
export interface Client {
  ws: WebSocketConnection;
  req: Req;
}

export type MiddleWare<T = WebsocketResponse, F = undefined> = (
  client: Client,
  payload: Payload<T, F>,
  next: () => void
) => void;

export type Route<T = WebsocketResponse, F = undefined> = (client: Client, payload: Payload<T, F>) => void;
