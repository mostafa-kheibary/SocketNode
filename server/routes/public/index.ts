import { Router } from "../../sockets/Router";
import { MiddleWare } from "../../sockets/SocketServer";
import product from "./products";

const publicRouter = new Router("public");

publicRouter.add(product);

const logger: MiddleWare = (client, data, next) => {
  setTimeout(() => {
    next();
  }, 2000);
};

const logger2: MiddleWare = (client, data, next) => {
  console.log(client.req.clientId);
  setTimeout(() => {
    next();
  }, 1000);
};

publicRouter.on("test", logger, logger2, (client, data) => {
  console.log();
  client.connection.sendAction("hi", client.req.user);
});

export default publicRouter;
