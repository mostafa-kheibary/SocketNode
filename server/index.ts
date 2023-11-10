import router from "./routes/router";
import { WebSocketServer } from "./sockets/Server";
import http from "http";

const server = http.createServer();

export const app = new WebSocketServer({
  server,
  handleUpgrade: (socket, req, next) => {
    req.user = "lol";
    next();
  },
});

app.add(router);

server.listen(3200);
console.log("3200");
