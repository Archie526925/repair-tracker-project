import { Router, type IRouter } from "express";
import healthRouter from "./health";
import repairsRouter from "./repairs";
import statsRouter from "./stats";
import customFieldsRouter from "./custom-fields";
import categoriesRouter from "./categories";
import authRouter from "./auth";
import adminUsersRouter from "./admin-users";
import groupsRouter from "./groups";
import { authMiddleware } from "../middlewares/auth";

const router: IRouter = Router();

// Public routes
router.use("/auth", authRouter);
router.use(healthRouter);

// Protected routes
router.use(authMiddleware);
router.use(repairsRouter);
router.use(statsRouter);
router.use(customFieldsRouter);
router.use(categoriesRouter);
router.use(adminUsersRouter);
router.use(groupsRouter);

export default router;
