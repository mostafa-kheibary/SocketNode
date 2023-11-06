import { Router } from "../../../sockets/Router";

const product = new Router("product");

product.on("get", () => {
  console.log("getting product");
});

product.on("send", () => {
  console.log("send product");
});
export default product;
