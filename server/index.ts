import router from "./routes/router";
import { SocketServer } from "./sockets";
import http from "http";

const server = http.createServer();

const wss = new SocketServer({
  server,
  handleUpgrade: (connection, req, next) => {
    req.user = "lol";
    next();
  },
});

wss.add(router);
wss.on("connection", () => {
  console.log("lets goooooo");
});
server.listen(3200);
console.log("3200");
