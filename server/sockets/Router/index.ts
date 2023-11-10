import { EventEmitter } from "events";
import { Client, MiddleWare, Payload, Route } from "../index.d";
import { WebsocketResponse } from "../types/SocketServer";

export class Router extends EventEmitter {
  routes: Map<string, Router> = new Map();

  constructor(private prefix: string = "") {
    super();
  }

  public add(child: Router): void {
    const key = child.prefix !== undefined ? child.prefix : "";
    if (this.routes.has(key)) {
      throw new Error(`A child router with prefix '${key}' has already been added.`);
    }
    this.routes.set(key, child);
  }

  public emit(eventName: string, client: Client, payload: Payload<any, any>): boolean {
    eventName = eventName.startsWith("/") ? eventName.replace("/", "") : eventName;

    const indexOfSlash = eventName.indexOf("/");
    if (indexOfSlash !== -1) {
      const nextPrefix = eventName.substring(0, indexOfSlash);
      const childEventName = eventName.substring(indexOfSlash + 1);

      if (this.routes.has("")) {
        return this.routes.get("")!.emit(eventName, client, payload);
      }
      if (this.routes.has(nextPrefix)) {
        return this.routes.get(nextPrefix)!.emit(childEventName, client, payload);
      }
    }
    return super.emit(eventName, client, payload);
  }
  on<T = WebsocketResponse, F extends Record<string, string> | undefined = Record<string, string> | undefined>(
    event: string,
    ...middleWare: MiddleWare<T, F>[]
  ): this {
    const innerListener: Route<T, F> = (client, payload) => {
      let index = 0;
      const next = () => {
        index++;
        middleWare[index](client, payload, next);
      };
      middleWare[index](client, payload, next);
    };
    if (middleWare.length === 1) {
      return super.on(event, middleWare[0]);
    }
    return super.on(event, innerListener);
  }
  once<T = WebsocketResponse, F extends Record<string, string> | undefined = Record<string, string> | undefined>(
    event: string,
    listener: Route<T, F>
  ): this {
    return super.once(event, listener);
  }
  prependListener<
    T = WebsocketResponse,
    F extends Record<string, string> | undefined = Record<string, string> | undefined
  >(event: string, listener: Route<T, F>): this {
    return super.prependListener(event, listener);
  }
  prependOnceListener<
    T = WebsocketResponse,
    F extends Record<string, string> | undefined = Record<string, string> | undefined
  >(event: string, listener: Route<T, F>): this {
    return super.prependOnceListener(event, listener);
  }
  off(event: string, listener: (...args: any[]) => void): this {
    return super.off(event, listener);
  }
  removeListener(event: string, listener: (...args: any[]) => void): this {
    return super.removeListener(event, listener);
  }
}
