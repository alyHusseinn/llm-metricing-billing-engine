import { Router } from "express"
import llmController from "../controllers/llmController"
import { authenticate } from "../middleware/authenticate";
import { idempotencyCheck } from "../middleware/idemptencyCheck";

const llmRouter = Router();

llmRouter.post("/generate", authenticate, idempotencyCheck, llmController.llmGenerate)

export default llmRouter;