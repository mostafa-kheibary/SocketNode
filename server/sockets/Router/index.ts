import { EventEmitter } from "events";
import { ActionEventName, ActionRoute, MiddleWare, SocketData } from "../SocketServer";

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

  public emit(eventName: string, ...args: any[]): boolean {
    eventName = eventName.startsWith("/") ? eventName.replace("/", "") : eventName;

    const indexOfSlash = eventName.indexOf("/");
    if (indexOfSlash !== -1) {
      const nextPrefix = eventName.substring(0, indexOfSlash);
      const childEventName = eventName.substring(indexOfSlash + 1);

      if (this.routes.has("")) {
        return this.routes.get("")!.emit(eventName, ...args);
      }
      if (this.routes.has(nextPrefix)) {
        return this.routes.get(nextPrefix)!.emit(childEventName, ...args);
      }
    }
    return super.emit(eventName, ...args);
  }
  on<T = SocketData, F extends Record<string, string> | undefined = Record<string, string> | undefined>(
    event: ActionEventName,
    ...middleWare: MiddleWare<T, F>[]
  ): this {
    const innerListener: ActionRoute<T, F> = (client, payload) => {
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
  once<T = SocketData, F extends Record<string, string> | undefined = Record<string, string> | undefined>(
    event: ActionEventName,
    listener: ActionRoute<T, F>
  ): this {
    return super.once(event, listener);
  }
  prependListener<T = SocketData, F extends Record<string, string> | undefined = Record<string, string> | undefined>(
    event: ActionEventName,
    listener: ActionRoute<T, F>
  ): this {
    return super.prependListener(event, listener);
  }
  prependOnceListener<
    T = SocketData,
    F extends Record<string, string> | undefined = Record<string, string> | undefined
  >(event: ActionEventName, listener: ActionRoute<T, F>): this {
    return super.prependOnceListener(event, listener);
  }
  off<T = SocketData, F extends Record<string, string> | undefined = Record<string, string> | undefined>(
    event: ActionEventName,
    listener: ActionRoute<T, F>
  ): this {
    return super.off(event, listener);
  }
  removeListener<T = SocketData, F extends Record<string, string> | undefined = Record<string, string> | undefined>(
    event: ActionEventName,
    listener: ActionRoute<T, F>
  ): this {
    return super.removeListener(event, listener);
  }
}
