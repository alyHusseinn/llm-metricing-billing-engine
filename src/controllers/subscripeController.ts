import { Response } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { AuthRequest } from "../middleware/authenticate";
import { db } from "../db";
import { planTable, subscriptionTable } from "../db/schema";
import { env } from "../utils/env";

const stripeApiKey = env.STRIPE_SECRET_KEY || "";
const stripeClient = new Stripe(stripeApiKey);

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;


const subscribeSchema = z.object({
    planName: z.enum(["Pro"]).default("Pro"),
});

/**
 * POST /subscripe 
 */
export const subscripe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;

        const parsed = subscribeSchema.safeParse(req.body || {});
        if (!parsed.success) {
            res.status(400).json({
                error: parsed.error.flatten().fieldErrors,
                code: "INVALID_REQUEST_BODY",
            });
            return;
        }

        const { planName } = parsed.data;

        // user has active sub?
        const [activeSubWithPlan] = await db
            .select({
                subscription: subscriptionTable,
                plan: planTable,
            })
            .from(subscriptionTable)
            .innerJoin(planTable, eq(subscriptionTable.planId, planTable.id))
            .where(
                and(
                    eq(subscriptionTable.userId, userId!),
                    eq(subscriptionTable.status, "Active")
                )
            )
            .limit(1);

        if (activeSubWithPlan) {
            const { subscription, plan } = activeSubWithPlan;
            const cycleStart = new Date(subscription.startDate).getTime();
            const expirationDate = new Date(cycleStart + THIRTY_DAYS_MS);
            const isExpired = new Date() > expirationDate;

            if (isExpired) {
                // mark it as Past_due so user can renew
                await db
                    .update(subscriptionTable)
                    .set({ status: "Past_due" })
                    .where(eq(subscriptionTable.id, subscription.id));
            } else if (plan.name === planName) {
                // User already has this paid plan active and not expired
                res.status(409).json({
                    error: `You already have an active ${planName} subscription.`,
                    code: "ACTIVE_SUBSCRIPTION_EXISTS",
                    subscriptionId: subscription.id,
                    expiresAt: expirationDate.toISOString(),
                });
                return;
            }
            // If user has active Free plan and wants Pro -> allow upgrade!
        }

        const [targetPlan] = await db.select().from(planTable).where(eq(planTable.name, planName));

        const appBaseUrl = env.APP_URL || `http://localhost:${env.PORT}`;
        const successUrl = `${appBaseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${appBaseUrl}/subscription/cancel`;

        const session = await stripeClient.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: "price_1UHEtYAyJ4GTziQDBOR2clLV",
                    quantity: 1,
                },
            ],
            // This metadata identify the user on webhooks
            metadata: {
                userId: String(userId),
                planId: String(targetPlan.id),
                planName: targetPlan.name,
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

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