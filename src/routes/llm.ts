import { Router } from "express"
import llmController from "../controllers/llmController"
import { authenticate } from "../middleware/authenticate";

const llmRouter = Router();

llmRouter.post("/generate", authenticate, llmController.llmGenerate)

export default llmRouter;