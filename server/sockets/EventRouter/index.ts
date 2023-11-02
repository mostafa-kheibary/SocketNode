import { EventEmitter } from "events";
import {
  ActionEventName,
  ActionRoute,
  Client,
  SocketData,
  SocketProperties,
} from "../SocketServer";
import { logger } from "../logger";

export class Router {
  routers: Map<string, Routes[]> = new Map();
  async add(prefix: string, Routes: Routes): Promise<void>;
  async add(Routes: Routes): Promise<void>;

  async add(prefixOrRoutes: string | Routes, Routes?: Routes): Promise<void> {
    let prefix: string = "";
    let routes: Routes;

    prefix = typeof prefixOrRoutes === "string" ? prefixOrRoutes : "";
    routes =
      typeof prefixOrRoutes === "string" ? (Routes as Routes) : prefixOrRoutes;

    const prevRoutes = this.routers.get(prefix) || [];
    this.routers.set(prefix, [...prevRoutes, routes]);
  }
  emitRouter(
    routeName: string,
    client: Client,
    payload: { data: SocketData; properties: SocketProperties }
  ) {
    const routeNameArray = routeName.split("/");
    const name = routeNameArray.pop() as string;
    const path = routeNameArray.join("/");

    const routers = this.routers.get(path);
    if (!routers)
      return logger.warn(
        `router dose not exist ${path ? path + "/" : path}${name} `
      );

    routers.forEach((actionRoute) => {
      if (!actionRoute.listeners(name).length)
        return logger.warn(
          `event dose not exist ${path ? path + "/" : path}${name} `
        );

      actionRoute.emit(name, client, payload);
    });
  }
}
export class Routes extends EventEmitter {
  on<
    T = SocketData,
    F extends Record<string, string> | undefined =
      | Record<string, string>
      | undefined
  >(event: ActionEventName, listener: ActionRoute<T, F>): this {
    return super.on(event, listener);
  }
  addListener<
    T = SocketData,
    F extends Record<string, string> | undefined =
      | Record<string, string>
      | undefined
  >(event: ActionEventName, listener: ActionRoute<T, F>): this {
    return super.addListener(event, listener);
  }
  once<
    T = SocketData,
    F extends Record<string, string> | undefined =
      | Record<string, string>
      | undefined
  >(event: ActionEventName, listener: ActionRoute<T, F>): this {
    return super.once(event, listener);
  }
  prependListener<
    T = SocketData,
    F extends Record<string, string> | undefined =
      | Record<string, string>
      | undefined
  >(event: ActionEventName, listener: ActionRoute<T, F>): this {
    return super.prependListener(event, listener);
  }
  prependOnceListener<
    T = SocketData,
    F extends Record<string, string> | undefined =
      | Record<string, string>
      | undefined
  >(event: ActionEventName, listener: ActionRoute<T, F>): this {
    return super.prependOnceListener(event, listener);
  }
  off<
    T = SocketData,
    F extends Record<string, string> | undefined =
      | Record<string, string>
      | undefined
  >(event: ActionEventName, listener: ActionRoute<T, F>): this {
    return super.off(event, listener);
  }
  removeListener<
    T = SocketData,
    F extends Record<string, string> | undefined =
      | Record<string, string>
      | undefined
  >(event: ActionEventName, listener: ActionRoute<T, F>): this {
    return super.removeListener(event, listener);
  }
}
