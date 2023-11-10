import { WebSocket } from "ws";
import { Req } from "..";
import { encodeSocketProtocol } from "../Protocol/encode";

export class WebSocketConnection {
  private _rooms: Map<string, string[]> = new Map();
  private _usersRoomMap: Map<string, string[]> = new Map();

  constructor(public ws: WebSocket, public connections: any, public req: Req) {
    this.ws.binaryType = "arraybuffer";
  }
  public close(code?: number) {
    this.ws.close(code);
  }
  public send(action: string, data: any) {
    return new Promise<void>((res) => {
      const client = this.connections.get(this.req.clientId);
      if (!client || client.ws.readyState !== WebSocket.OPEN) return;

      const binary = encodeSocketProtocol(action, data);
      client.ws.send(binary, () => res());
    });
  }
  public join(room: string, req: Req) {
    const rooms = this._rooms.get(room) || [];
    const userMapRoom = this._usersRoomMap.get(req.clientId) || [];

    if (!rooms.find((clientId) => clientId === req.clientId)) {
      this._rooms.set(room, [...rooms, req.clientId]);
    }
    if (!userMapRoom.find((cRoom) => cRoom === room)) {
      this._usersRoomMap.set(req.clientId, [...userMapRoom, room]);
    }
  }
  public left(room: string, req: Req) {
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
  public roomBroadcast(route: string, data: any, req: Req) {
    const rooms = this._usersRoomMap.get(req.clientId) || [];
    rooms.forEach((room) => {
      const clients = this._rooms.get(room) || [];
      clients.forEach((clientId) => {
        const client = this.connections.get(clientId);
        if (!client) return;
        client.send(route, data);
      });
    });
  }
}
