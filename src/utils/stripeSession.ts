import { env } from "../utils/env";
import Stripe from "stripe";

export const createStripeCheckoutSession = async (userId: string, planId: string, planName: string): Promise<Stripe.Checkout.Session | null> => {
    const stripeApiKey = env.STRIPE_SECRET_KEY || "";
    const stripeClient = new Stripe(stripeApiKey);
    const appBaseUrl = env.APP_URL || `http://localhost:${env.PORT}`;
    const successUrl = `${appBaseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appBaseUrl}/subscription/cancel`;

    let session: Stripe.Checkout.Session;

    try {
        session = await stripeClient.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: env.STRIPE_PRICEID,
                    quantity: 1,
                },
            ],
            // This metadata identify the user on webhooks
            metadata: {
                userId: String(userId),
                planId: String(planId),
                planName: planName,
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        });
    } catch (error) {
        console.error("Error creating Stripe checkout session:", error);
        throw new Error("Failed to create Stripe checkout session");
    }
    return session;
}