import { NextFunction, Response } from "express";
import { AuthRequest } from "./authenticate";

export const idempotencyCheck = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const idempotencyKey = (req.headers["idempotency-key"]) as string | undefined;
    if (!idempotencyKey || typeof idempotencyKey !== "string" || idempotencyKey.trim() === "") {
        res.status(400).json({
            error: "Missing required 'Idempotency-Key' header",
            code: "MISSING_IDEMPOTENCY_KEY",
        });
        return;
    }
    // get usage event by subscriptionId and requestId
    next();
};
