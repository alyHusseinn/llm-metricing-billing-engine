import { Response } from "express";
import { AuthRequest } from "../middleware/authenticate";
import { planTable, subscriptionTable, usageEventTable } from "../db/schema";
import { db } from "../db";
import { eq, and, sum, count } from "drizzle-orm";

export const llmGenerate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
            return;
        }

        // Validate Idempotency Header
        const idempotencyKey = (req.headers["idempotency-key"]) as string | undefined;
        if (!idempotencyKey || typeof idempotencyKey !== "string" || idempotencyKey.trim() === "") {
            res.status(400).json({
                error: "Missing required 'Idempotency-Key' header",
                code: "MISSING_IDEMPOTENCY_KEY",
            });
            return;
        }

        // Find the user's active subscription
        const [activeSubWithPlan] = await db
            .select({
                subscription: subscriptionTable,
                plan: planTable,
            })
            .from(subscriptionTable)
            .innerJoin(planTable, eq(subscriptionTable.planId, planTable.id))
            .where(
                and(
                    eq(subscriptionTable.userId, userId),
                    eq(subscriptionTable.status, "Active")
                )
            )
            .limit(1);

        if (!activeSubWithPlan) {
            res.status(402).json({
                error: "Active subscription required. Please subscribe to a plan.",
                code: "NO_ACTIVE_SUBSCRIPTION",
            });
            return;
        }

        const { subscription, plan } = activeSubWithPlan;

        // Verify Expiration max 30 days
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const cycleStart = new Date(subscription.startDate);
        const expirationDate = new Date(cycleStart.getTime() + THIRTY_DAYS_MS);

        if (new Date() > expirationDate) {
            await db
                .update(subscriptionTable)
                .set({ status: "Past_due" })
                .where(eq(subscriptionTable.id, subscription.id));

            res.status(402).json({
                error: "Subscription period has expired. Please renew your subscription.",
                code: "SUBSCRIPTION_EXPIRED",
            });
            return;
        }

        // Check Idempotency Cache
        const [existingEvent] = await db
            .select()
            .from(usageEventTable)
            .where(
                and(
                    eq(usageEventTable.subscriptionId, subscription.id),
                    eq(usageEventTable.requestId, idempotencyKey)
                )
            )
            .limit(1);

        if (existingEvent) {
            res.status(200).json({
                answer: "AI answer (cached)",
                cached: true,
                usage: {
                    inputTokens: 0,
                    outputTokens: 0,
                    totalTokens: 0,
                },
            });
            return;
        }

        // Check Quota for the CURRENT cycle
        const [usageResult] = await db
            .select({ totalTokensUsed: sum(usageEventTable.totalTokens), totalRequests: count() })
            .from(usageEventTable)
            .where(
                and(
                    eq(usageEventTable.subscriptionId, subscription.id),
                )
            );

        const tokensUsed = Number(usageResult?.totalTokensUsed ?? 0);
        const requestsUsed = Number(usageResult?.totalRequests ?? 0)
        const ESTIMATED_CALL_TOKENS = 5000; // Expected input + output tokens

        if (tokensUsed + ESTIMATED_CALL_TOKENS > plan.tokensLimit) {
            // update the subscription status to Limit_exceeded
            await db
                .update(subscriptionTable)
                .set({ status: "Limit_Exceeded" })
                .where(eq(subscriptionTable.id, subscription.id));

            res.status(429).json({
                error: "Token quota exceeded for the current billing period",
                code: "QUOTA_EXCEEDED",
                currentUsage: tokensUsed,
                limit: plan.tokensLimit,
            });
            return;
        } else if (requestsUsed >= plan.requestsLimit) {
            await db
                .update(subscriptionTable)
                .set({ status: "Limit_Exceeded" })
                .where(eq(subscriptionTable.id, subscription.id));

            res.status(429).json({
                error: "Requests quota exceeds for the current billing period",
                code: "QOUTA_EXCEEDED",
                currentUsage: requestsUsed,
                limit: plan.requestsLimit
            })
            return
        }

        // Simulated Call to LLM
        const inputTokens = 1000, outputTokens = 2500, reasoningTokens = 1000, cachedTokens = 500;
        const generatedAnswer = "AI answer";

        // Record Usage Event 
        await db.insert(usageEventTable).values({
            subscriptionId: subscription.id,
            requestId: idempotencyKey,
            inputTokens,
            outputTokens,
            reasoningTokens,
            cachedTokens,
            requestStatus: "Succeeded",
        });

        res.status(200).json({
            answer: generatedAnswer,
            cached: false,
            usage: {
                inputTokens,
                outputTokens,
                reasoningTokens,
                cachedTokens,
                totalTokens: inputTokens + outputTokens + reasoningTokens + cachedTokens,
                remainingTokens: plan.tokensLimit - (tokensUsed + inputTokens + outputTokens),
            },
        });
    } catch (error) {
        console.error("LLM Generate Error:", error);
        res.status(500).json({
            error: "Internal server error processing LLM generation",
            code: "INTERNAL_ERROR",
        });
    }
};

export default {
    llmGenerate,                           
};