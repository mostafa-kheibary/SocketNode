import { IncomingMessage } from "http";
import { WebSocketServer as WsServer, Server, RawData } from "ws";
import { WebsocketOptions } from "../types/SocketServer";
import { Req } from "..";
import { Router } from "../Router";
import internal from "stream";
import { decodeSocketProtocol } from "../Protocol/decode";
import { queryParamsParser } from "../utils/queryParamsParser";
import { WebSocketConnection } from "./Connection";

export class WebSocketServer extends Router {
  ws: Server;
  connections: Map<string, WebSocketConnection> = new Map();

  constructor(private options: WebsocketOptions) {
    super();
    this.ws = new WsServer({
      noServer: true,
      path: this.options.path,
      perMessageDeflate: false,
      handleProtocols: (protocols) => {
        if (protocols.has("binary")) {
          return "binary";
        }
        return false;
      },
    });
    this.options.server.on("upgrade", (r, s, h) => this.onUpgrade(r, s, h));
    this.ws.on("connection", (connection: any, req: any) => this.onConnection(connection, req));
  }

  private async onUpgrade(request: IncomingMessage, socket: internal.Duplex, head: Buffer) {
    if (request.headers["sec-websocket-protocol"] !== "binary") {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\nUnsupported WebSocket subprotocol. Expected 'binary'.", () => {
        socket.destroy();
      });
    }
    const parameters = queryParamsParser(request.url as any);
    const clientId = crypto.randomUUID();
    const req: Req = { clientId, parameters };
    if (!this.options.handleUpgrade) {
      this.ws.handleUpgrade(request, socket, head, (ws) => {
        const connection = new WebSocketConnection(ws, this.connections, req);
        this.ws.emit("connection", connection, req);
      });
      return;
    }
    this.options.handleUpgrade(socket, req, () => {
      this.ws.handleUpgrade(request, socket, head, (ws) => {
        const connection = new WebSocketConnection(ws, this.connections, req);
        this.ws.emit("connection", connection, req);
      });
    });
  }

  private onConnection(connection: WebSocketConnection, req: Req) {
    const sameConnection = this.connections.has(req.clientId);
    if (sameConnection) {
      return connection.close();
    }
    this.connections.set(req.clientId, connection);

    this.emit("connection", { ws: connection, req }, { data: null, properties: {} });
    connection.ws.prependListener("close", () => {
      this.emit("close", { ws: connection, req }, { data: null, properties: {} });
      connection.ws.removeAllListeners();
    });
    connection.ws.on("close", () => this.connections.delete(req.clientId));
    connection.ws.on("message", (rawData) => this.onMessage(rawData, req));
  }
  onMessage(rawData: RawData, req: Req) {
    const client = this.connections.get(req.clientId);
    if (!client) return;

    const { data, properties } = decodeSocketProtocol(rawData as ArrayBuffer);
    this.emit(properties.route, { ws: client, req }, { data, properties });
  }
}
