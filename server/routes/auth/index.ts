import { Router } from "../../sockets/Router";

const auth = new Router("auth");

auth.on("admin", () => {
  console.log("admin auth route");
});

export default auth;
