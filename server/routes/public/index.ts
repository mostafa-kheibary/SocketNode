import { Router } from "../../sockets/Router";
import { MiddleWare } from "../../sockets/index.d";

const publicRouter = new Router("public");

publicRouter.on("test", (client, data) => {
  client.ws.sendAction("hi", client.req.user);
});

export default publicRouter;
