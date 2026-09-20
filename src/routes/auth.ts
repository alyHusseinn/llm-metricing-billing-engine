/**
 * Auth routes
 *
 * POST /auth/signup  – create account, returns JWT
 * POST /auth/login   – authenticate, returns JWT
 */

import { Router } from "express";
import { signup, login } from "../controllers/authController";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);

export default router;