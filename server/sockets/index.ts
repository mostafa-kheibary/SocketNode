import { IncomingMessage } from "http";
import { WebSocket, WebSocketServer as WsServer, Server, RawData } from "ws";
import { WebSocketConnection, WebsocketOptions } from "./types/SocketServer";
import { Req } from "./index.d";
import { Router } from "./Router";
import internal from "stream";
import { decodeSocketProtocol } from "./Protocol/decode";
import { encodeSocketProtocol } from "./Protocol/encode";
import { queryParamsParser } from "./utils/queryParamsParser";

export class WebSocketServer extends Router {
  ws: Server;
  connections: Map<string, WebSocketConnection> = new Map();
  private _rooms: Map<string, string[]> = new Map();
  private _usersRoomMap: Map<string, string[]> = new Map();

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
        this.ws.emit("connection", ws, req);
      });
      return;
    }
    this.options.handleUpgrade(socket, req, () => {
      this.ws.handleUpgrade(request, socket, head, (ws) => {
        this.ws.emit("connection", ws, req);
      });
    });
  }
  private sendAction(action: string, data: any, req: Req) {
    return new Promise<void>((res) => {
      const client = this.connections.get(req.clientId);
      if (!client || client.readyState !== WebSocket.OPEN) return;

      const binary = encodeSocketProtocol(action, data);
      client.send(binary, () => res());
    });
  }
  private join(room: string, req: Req) {
    const rooms = this._rooms.get(room) || [];
    const userMapRoom = this._usersRoomMap.get(req.clientId) || [];

    if (!rooms.find((clientId) => clientId === req.clientId)) {
      this._rooms.set(room, [...rooms, req.clientId]);
    }
    if (!userMapRoom.find((cRoom) => cRoom === room)) {
      this._usersRoomMap.set(req.clientId, [...userMapRoom, room]);
    }
  }
  private left(room: string, req: Req) {
    const prevUsers = this._rooms.get(room) || [];
    const prevRooms = this._usersRoomMap.get(req.clientId) || [];

    const restPrevRooms = prevRooms.filter((cRoom) => cRoom !== room);
    const restUsersRoom = prevUsers.filter((clientId) => clientId !== req.clientId);

    this._rooms.set(room, restUsersRoom);
    this._usersRoomMap.set(req.clientId, restPrevRooms);

    if (!restPrevRooms.length) {
      this._usersRoomMap.delete(req.clientId);
    }
    if (!restUsersRoom.length) {
      this._rooms.delete(room);
    }
  }
  // TODO: refactor this !!!
  private roomBroadcast(route: string, data: any, req: Req) {
    const rooms = this._usersRoomMap.get(req.clientId) || [];
    rooms.forEach((room) => {
      const clients = this._rooms.get(room) || [];
      clients.forEach((clientId) => {
        const client = this.connections.get(clientId);
        if (!client) return;
        client.sendAction(route, data);
      });
    });
  }
  private onConnection(connection: WebSocketConnection, req: Req) {
    connection.sendAction = (action: string, data: any) => this.sendAction(action, data, req);
    connection.roomBroadcast = (action: string, data: any) => this.roomBroadcast(action, data, req);
    connection.join = (room: string) => this.join(room, req);
    connection.left = (room: string) => this.left(room, req);

    connection.binaryType = "arraybuffer";
    const sameConnection = this.connections.has(req.clientId);
    if (sameConnection) {
      return connection.close();
    }
    this.connections.set(req.clientId, connection);

    this.emit("connection", { ws: connection, req }, { data: null, properties: {} });
    connection.prependListener("close", () => {
      this.emit("close", { ws: connection, req }, { data: null, properties: {} });
      connection.removeAllListeners();
    });
    connection.on("close", () => this.connections.delete(req.clientId));
    connection.on("message", (rawData) => this.onMessage(rawData, req));
  }
  onMessage(rawData: RawData, req: Req) {
    const client = this.connections.get(req.clientId);
    if (!client) return;

    const { data, properties } = decodeSocketProtocol(rawData as ArrayBuffer);
    this.emit(properties.route, { ws: client, req }, { data, properties });
  }
}
