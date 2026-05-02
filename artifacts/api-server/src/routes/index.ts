import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clientsRouter from "./clients";
import vehiculesRouter from "./vehicules";
import interventionsRouter from "./interventions";
import mediasRouter from "./medias";
import statistiquesRouter from "./statistiques";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(clientsRouter);
router.use(vehiculesRouter);
router.use(interventionsRouter);
router.use(mediasRouter);
router.use(statistiquesRouter);

export default router;
