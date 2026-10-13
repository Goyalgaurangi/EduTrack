import { Router, type IRouter } from "express";
import healthRouter from "./health";
import edutrackRouter from "./edutrack";

const router: IRouter = Router();

router.use(healthRouter);
router.use(edutrackRouter);

export default router;
