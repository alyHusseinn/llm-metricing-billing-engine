import express, { Router } from "express";
import webhookController from "../controllers/webhook";

const router = Router();

// Stripe requires raw body Buffer for cryptographic signature verification
router.post(
  "/",
  express.raw({ type: "application/json" }),
  webhookController.handleWebhook
);

export default router;

