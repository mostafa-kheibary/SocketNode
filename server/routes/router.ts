import { Router } from "../sockets/Router";
import auth from "./auth";
import publicRouter from "./public";

const router = new Router();

router.add(publicRouter);
router.add(auth);

export default router;
