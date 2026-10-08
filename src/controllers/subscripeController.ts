import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/authenticate";
import subscriptionRepo from "../reposatory/subscriptionRepo";
import planRepo from "../reposatory/planRepo";
import { createStripeCheckoutSession } from "../utils/stripeSession";
import getExpirationDate from "../utils/expirationDate";

const subscribeSchema = z.object({
    planName: z.enum(["Pro"]).default("Pro"),
});

/**
 * POST /subscripe 
 * Body: { planName }
 * Check if user has active sub? if not create stripe session and return the session URL
 */
export const subscripe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;

        // Validate request body
        const parsed = subscribeSchema.safeParse(req.body || {});
        if (!parsed.success) {
            res.status(400).json({
                error: parsed.error.flatten().fieldErrors,
                code: "INVALID_REQUEST_BODY",
            });
            return;
        }

        const { planName } = parsed.data;

        // check if user has active sub?
        const activeSub = await subscriptionRepo.findActiveSubscriptionByUserId(userId);
        if (activeSub) {
            const expirationDate = getExpirationDate(activeSub.startDate);
            const isExpired = new Date() > expirationDate;

            if (isExpired) {
                // mark it as Past_due so user can renew
                await subscriptionRepo.updateSubscriptionStatus(activeSub.id, "Past_due");
            } else {
                // User already has active plan and not expired
                res.status(409).json({
                    error: `You already have an active subscription.`,
                    code: "ACTIVE_SUBSCRIPTION_EXISTS",
                    subscriptionId: activeSub.id,
                    expiresAt: expirationDate.toISOString(),
                });
                return;
            }
        }

        // Find the plan by name
        const targetPlan = await planRepo.findPlanByName(planName);
        if (!targetPlan) {
            res.status(404).json({
                error: `Plan not found: ${planName}`,
                code: "PLAN_NOT_FOUND",
            });
            return;
        }

        // Create a Stripe checkout session
        const session = await createStripeCheckoutSession(String(userId), String(targetPlan.id), targetPlan.name);

        if (!session) {
            res.status(500).json({
                error: "Failed to create Stripe checkout session",
                code: "STRIPE_SESSION_CREATION_FAILED",
            });
            return;
        }

        res.status(200).json({
            message: "Stripe checkout session created successfully",
            checkoutUrl: session.url,
            sessionId: session.id,
        });

    } catch (error) {
        console.error("Subscription Checkout Error:", error);
        res.status(500).json({
            error: "Failed to create subscription checkout session",
            code: "SUBSCRIPTION_CHECKOUT_FAILED",
        });
    }
};

const success = (req: AuthRequest, res: Response) => {
    console.log("user subscrpied sucessfully!")
    res.status(200).send("Congratulations! You subscriped successfully")
}

export default {
    subscripe,
    success
};