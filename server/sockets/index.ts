import { IncomingMessage } from "http";
import { WebSocket, WebSocketServer, Server, RawData } from "ws";
import {
  Connection,
  EmitActionData,
  MetaData,
  SocketConnection,
  SocketOption,
} from "./SocketServer";
import { Router } from "./EventRouter";
import internal from "stream";
import { decodeSocketProtocol, encodeSocketProtocol } from "./sockets";
import { logger } from "./logger";

export class SocketServer {
  ws: Server;
  authenticate: SocketOption["authenticate"];
  path: SocketOption["path"];
  router: Router = new Router();
  connections: Map<string, Connection[]> = new Map();
  rooms: Map<string, string[]> = new Map();
  usersRoomMap: Map<string, string[]> = new Map();

  constructor(options: SocketOption) {
    this.router = options.router;
    this.authenticate = options.authenticate;
    this.path = options.path;
    this.ws = new WebSocketServer({
      noServer: true,
      path: options.path,
      perMessageDeflate: false,
      handleProtocols: (protocols) => {
        if (protocols.has("yapot")) {
          return "yapot";
        }
        return false; // No suitable subprotocol found
      },
    });
    options.server.on("upgrade", (r, s, h) => this.onUpgrade(r, s, h));
    this.ws.on("connection", (c: any, _: any, m: any) =>
      this.onConnection(c, m)
    );
  }

  private async onUpgrade(
    request: IncomingMessage,
    socket: internal.Duplex,
    head: Buffer
  ) {
    if (request.headers["sec-websocket-protocol"] !== "yapot") {
      socket.write(
        "HTTP/1.1 400 Bad Request\r\n\r\nUnsupported WebSocket subprotocol. Expected 'yapot'.",
        () => {
          socket.destroy();
        }
      );

      return logger.warn(`Unsupported WebSocket subprotocol. Expected 'yapot'`);
    }
    const token = request.url?.split("?")[1] as string;

    if (!this.authenticate) {
      socket.write(
        "HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n",
        () => {
          socket.destroy();
        }
      );
      return logger.warn(`401 Unauthorized,${token}`);
    }
    let user: any;
    const sid = crypto.randomUUID();

    try {
      user = await this.authenticate(token);
      const metaData: MetaData = { sid, user };

      this.ws.handleUpgrade(request, socket, head, (ws) => {
        this.ws.emit("connection", ws, request, metaData);
      });
    } catch (err) {
      const error = err as { error: string; code: number };
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return logger.warn(
        error?.code || 4001,
        error?.error || "unexpected Auth error"
      );
    }
  }
  // action sender
  private emitAction({ data, meta, properties }: EmitActionData) {
    const client = (this.connections.get(meta.user.id) || []).find(
      (cn) => cn.sid === meta.sid
    );
    if (!client || !client.connection) return;

    this.router.emitRouter(
      properties.route,
      { ...client, connections: this.connections },
      { data, properties }
    );
  }
  private sendAction(action: string, data: any, meta: MetaData) {
    return new Promise<void>((res) => {
      const client = (this.connections.get(meta.user.id) || []).find(
        (cn) => cn.sid === meta.sid
      );
      if (!client || client.connection.readyState !== WebSocket.OPEN) return;

      const binary = encodeSocketProtocol(action, data);
      client.connection.send(binary, (err) => {
        if (err) {
          logger.error(err);
        }
        logger.info(`action send, id=${meta.user.id} action=${action}`);
        res();
      });
    });
  }
  private sessionBroadcast(action: string, data: any, meta: MetaData) {
    const client = (this.connections.get(meta.user.id) || []).filter(
      (cn) => cn.sid !== meta.sid
    );
    client.forEach((cn) => {
      cn.connection.sendAction(action, data);
    });
  }
  private join(room: string, meta: MetaData) {
    const rooms = this.rooms.get(room) || [];
    const userMapRoom = this.usersRoomMap.get(meta.user.id) || [];

    if (!rooms.find((clientId) => clientId === meta.user.id)) {
      this.rooms.set(room, [...rooms, meta.user.id]);
    }
    if (!userMapRoom.find((cRoom) => cRoom === room)) {
      this.usersRoomMap.set(meta.user.id, [...userMapRoom, room]);
    }
    logger.info(`User id=${meta.user.id} Join ${room}`);
  }
  private left(room: string, meta: MetaData) {
    const prevUsers = this.rooms.get(room) || [];
    const prevRooms = this.usersRoomMap.get(meta.user.id) || [];

    const restPrevRooms = prevRooms.filter((cRoom) => cRoom !== room);
    const restUsersRoom = prevUsers.filter(
      (clientId) => clientId !== meta.user.id
    );

    this.rooms.set(room, restUsersRoom);
    this.usersRoomMap.set(meta.user.id, restPrevRooms);

    if (!restPrevRooms.length) {
      this.usersRoomMap.delete(meta.user.id);
    }
    if (!restUsersRoom.length) {
      this.rooms.delete(room);
    }

    logger.info(`User id=${meta.user.id} Left ${room}`);
  }
  // TODO: refactor this !!!
  private roomBroadcast(action: string, data: any, meta: MetaData) {
    const rooms = this.usersRoomMap.get(meta.user.id) || [];
    rooms.forEach((room) => {
      const clients = this.rooms.get(room) || [];
      clients.forEach((clientId) => {
        const sessions = this.connections.get(clientId) || [];
        sessions.forEach((session) => {
          session.connection.sendAction(action, data);
        });
      });
    });
  }
  private onClose(metaData: MetaData) {
    const client = this.connections.get(metaData.user.id) || [];
    const restClient = client?.filter((cn) => cn.sid !== metaData.sid);

    if (!restClient.length) {
      this.connections.delete(metaData.user.id);
    } else {
      this.connections.set(metaData.user.id, restClient);
    }
  }
  private onConnection(connection: SocketConnection, meta: MetaData) {
    connection.prependListener("close", () => connection.removeAllListeners());
    connection.sendAction = (action: string, data: any) =>
      this.sendAction(action, data, meta);
    connection.sessionBroadcast = (action: string, data: any) =>
      this.sessionBroadcast(action, data, meta);
    connection.roomBroadcast = (action: string, data: any) =>
      this.roomBroadcast(action, data, meta);
    connection.join = (room: string) => this.join(room, meta);
    connection.left = (room: string) => this.left(room, meta);

    connection.binaryType = "arraybuffer";
    const prevConnections = this.connections.get(meta.user.id) || [];
    this.connections.set(meta.user.id, [
      ...prevConnections,
      { sid: meta.sid, user: meta.user, connection, producers: {} },
    ]);

    this.emitAction({ data: null, meta, properties: { route: "connection" } });

    connection.prependListener("close", () => {
      this.emitAction({ data: null, meta, properties: { route: "close" } });
    });
    connection.on("close", () => this.onClose(meta));
    connection.on("message", (rawData) => this.onMessage(rawData, meta));
  }
  onMessage(rawData: RawData, meta: MetaData) {
    const { data, properties } = decodeSocketProtocol(rawData as ArrayBuffer);
    console.log(data);
    this.emitAction({ data, meta, properties });
  }
}
