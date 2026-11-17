import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import videosRouter from "./videos";
import recommendationsRouter from "./recommendations";
import cartRouter from "./cart";
import adminRouter from "./admin";
import storageRouter from "./storage";
import weatherRouter from "./weather";
import ordersRouter from "./orders";
import appAccessRouter from "./app-access";
import fishingEventsRouter from "./fishing-events";
import fisheriesRouter from "./fisheries";
import metodapkaRouter from "./metodapka";
import dashboardRouter from "./dashboard";
import customersRouter from "./customers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(appAccessRouter);
router.use(productsRouter);
router.use(videosRouter);
router.use(recommendationsRouter);
router.use(cartRouter);
router.use(adminRouter);
router.use(dashboardRouter);
router.use(customersRouter);
router.use(storageRouter);
router.use(weatherRouter);
router.use(ordersRouter);
router.use(fishingEventsRouter);
router.use(fisheriesRouter);
router.use(metodapkaRouter);

export default router;
