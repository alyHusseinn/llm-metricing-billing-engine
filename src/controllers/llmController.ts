import { Response } from "express";
import { AuthRequest } from "../middleware/authenticate";
import subscriptionRepo from "../reposatory/subscriptionRepo";
import planRepo from "../reposatory/planRepo";
import usageRepo from "../reposatory/usageRepo";
import getExpirationDate from "../utils/expirationDate"
import callLLM from "../utils/callLlm"
import pushNotificationToQueue from "../utils/pushNotificaitonToQueue";

export const llmGenerate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const idempotencyKey = (req.headers["idempotency-key"]) as string;

        // Find the user's active subscription
        const subscription = await subscriptionRepo.findActiveSubscriptionByUserId(userId!);

        if (!subscription) {
            res.status(402).json({
                error: "Active subscription required. Please subscribe to a plan.",
                code: "NO_ACTIVE_SUBSCRIPTION",
            });
            return;
        }

        // Verify Expiration max 30 days
        const expirationDate = getExpirationDate(subscription.startDate)

        if (new Date() > expirationDate) {
            await subscriptionRepo.updateSubscriptionStatus(subscription.id, "Past_due")

            res.status(402).json({
                error: "Subscription period has expired. Please renew your subscription.",
                code: "SUBSCRIPTION_EXPIRED",
            });
            return;
        }

        // Check Idempotency Cache
        const existingEvent = await usageRepo.findUsageEventBySubscriptionIdAndRequestId(subscription.id, idempotencyKey);

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
        const usageResult = await usageRepo.getUsageSummaryBySubscriptionId(subscription.id)
        const plan = await planRepo.findPlanById(subscription.planId)!;

        const tokensUsed = Number(usageResult?.totalTokensUsed);
        const requestsUsed = Number(usageResult?.totalRequests)
        const ESTIMATED_CALL_TOKENS = 5000; // Expected input + output tokens

        if (tokensUsed + ESTIMATED_CALL_TOKENS > plan!.tokensLimit) {
            // update the subscription status to Limit_exceeded
            await subscriptionRepo.updateSubscriptionStatus(subscription.id, "Limit_Exceeded")

            res.status(429).json({
                error: "Token quota exceeded for the current billing period",
                code: "QUOTA_EXCEEDED",
                currentUsage: tokensUsed,
                limit: plan!.tokensLimit,
            });
            return;
        } else if (requestsUsed >= plan!.requestsLimit) {
            await subscriptionRepo.updateSubscriptionStatus(subscription.id, "Limit_Exceeded")

            res.status(429).json({
                error: "Requests quota exceeds for the current billing period",
                code: "QOUTA_EXCEEDED",
                currentUsage: requestsUsed,
                limit: plan!.requestsLimit
            })
            return
        }

        // Simulated Call to LLM
        const { inputTokens, outputTokens, reasoningTokens, cachedTokens, totalTokens, generatedAnswer } = await callLLM();

        // Record Usage Event 
        await usageRepo.recordUsageEvent(subscription.id, idempotencyKey, inputTokens, outputTokens, reasoningTokens, cachedTokens, totalTokens);

        // Check if the remaining tokens are below the threshold and send email if necessary
        // calculate total used tokens -> compare 
        const remainingTokens = plan!.tokensLimit - (tokensUsed + totalTokens);

        res.status(200).json({
            answer: generatedAnswer,
            cached: false,
            usage: {
                inputTokens,
                outputTokens,
                reasoningTokens,
                cachedTokens,
                totalTokens,
                remainingTokens: plan!.tokensLimit - (tokensUsed + totalTokens),
            },
        });

        // Push Notification to Queue
        await pushNotificationToQueue(remainingTokens, plan!.tokensLimit, { userId: userId!, subscriptionId: subscription.id });
        
        return
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