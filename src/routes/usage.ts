import express from "express"
import usageController from "../controllers/usageController"
import { authenticate } from "../middleware/authenticate";


const router = express();

router.get("/", authenticate, usageController.rollupUsage)

export default router;