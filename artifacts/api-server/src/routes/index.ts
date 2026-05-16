import { Router, type IRouter } from "express";
import healthRouter from "./health";
import repairsRouter from "./repairs";
import statsRouter from "./stats";
import customFieldsRouter from "./custom-fields";
import categoriesRouter from "./categories";

const router: IRouter = Router();

router.use(healthRouter);
router.use(repairsRouter);
router.use(statsRouter);
router.use(customFieldsRouter);
router.use(categoriesRouter);

export default router;
