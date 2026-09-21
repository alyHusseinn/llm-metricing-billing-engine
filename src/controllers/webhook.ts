import { Request, Response } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { subscriptionTable } from "../db/schema";
import { env } from "../utils/env";

const stripeApiKey = env.STRIPE_SECRET_KEY || "";
const stripeWebhookSecret = env.STRIPE_WEBHOOK_SECRET || "";

const stripeClient = new Stripe(stripeApiKey);

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers["stripe-signature"];

    if (!sig || typeof sig !== "string") {
        res.status(400).json({ error: "Missing or invalid Stripe signature header" });
        return;
    }

    if (!stripeWebhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET is not configured in environment variables");
        res.status(500).json({ error: "Webhook secret is not configured on the server" });
        return;
    }

    let event: Stripe.Event;

    try {
        event = stripeClient.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`Stripe Webhook Signature Verification Failed: ${message}`);
        res.status(400).send(`Webhook Error: ${message}`);
        return;
    }

    try {
        switch (event.type) {

            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;

                if (session.mode === "subscription") {
                    const userId = session.metadata?.userId;
                    const planId = session.metadata?.planId;
                    const stripeSubscriptionId = session.subscription as string | null;

                    if (userId && planId) {
                        console.log(`💳 Activating subscription for user ${userId}, plan ${planId}`);

                        // Insert the new active subscription
                        await db.insert(subscriptionTable).values({
                            userId: Number(userId),
                            planId: Number(planId),
                            stripeSubscriptionId: stripeSubscriptionId || null,
                            status: "Active",
                            startDate: new Date(),
                        });

                        console.log(`Subscription activated for user ${userId}`);
                    } else {
                        console.warn("Checkout session completed without userId or planId in metadata");
                    }
                }
                break;
            }

            /**
             * renewal, past_due, canceled.
             */
            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                const stripeSubId = subscription.id;
                const stripeStatus = subscription.status;

                console.log(`Subscription ${stripeSubId} status updated to: ${stripeStatus}`);

                let newStatus: "Active" | "Past_due" | "Canceled" = "Active";
                if (stripeStatus === "past_due") {
                    newStatus = "Past_due";
                } else if (stripeStatus === "canceled" || stripeStatus === "unpaid") {
                    newStatus = "Canceled";
                }

                await db
                    .update(subscriptionTable)
                    .set({
                        status: newStatus,
                        ...(newStatus === "Active" ? { startDate: new Date() } : {}),
                    })
                    .where(eq(subscriptionTable.stripeSubscriptionId, stripeSubId));
                break;
            }


            //deleted / canceled in Stripe.

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                const stripeSubId = subscription.id;

                console.log(`Subscription ${stripeSubId} deleted in Stripe`);

                await db
                    .update(subscriptionTable)
                    .set({ status: "Canceled" })
                    .where(eq(subscriptionTable.stripeSubscriptionId, stripeSubId));
                break;
            }

            default:
                break;
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error("Error handling Stripe webhook event:", error);
        res.status(500).json({ error: "Internal error processing webhook" });
    }
};

export default {
    handleWebhook,
};