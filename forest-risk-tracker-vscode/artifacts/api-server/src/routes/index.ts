import { Router, type IRouter } from "express";
import healthRouter from "./health";
import forestRouter from "./forest";
import wildshieldRouter from "./wildshield";

const router: IRouter = Router();

router.use(healthRouter);
router.use(forestRouter);
router.use(wildshieldRouter);

export default router;

