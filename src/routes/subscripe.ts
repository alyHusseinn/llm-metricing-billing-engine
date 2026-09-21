import express from "express"
import { authenticate } from "../middleware/authenticate";
import subscripeController from "../controllers/subscripeController"

const router = express.Router();

router.post("/subscripe", authenticate, subscripeController.subscripe);
router.get("/success", subscripeController.success)

export default router;
