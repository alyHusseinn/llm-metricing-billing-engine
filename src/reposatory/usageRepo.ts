import { db } from "../db";
import { usageEventTable } from "../db/schema";
import { eq, and, count, sum } from "drizzle-orm";

const usageRepo = {
    async findUsageEventBySubscriptionIdAndRequestId(subscriptionId: number, requestId: string) {
        let usageEvent;
        try {
            [usageEvent] = await db
                .select()
                .from(usageEventTable)
                .where(
                    and(
                        eq(usageEventTable.subscriptionId, subscriptionId),
                        eq(usageEventTable.requestId, requestId)
                    )
                )
                .limit(1);
        } catch (error) {
            console.error("Error fetching usage event:", error);
            return null;
        }
        return usageEvent || null;
    },
    async getUsageSummaryBySubscriptionId(subscriptionId: number) {
        let usageSummary;
        try {
            [usageSummary] = await db
                .select({ totalTokensUsed: sum(usageEventTable.totalTokens), totalRequests: count() })
                .from(usageEventTable)
                .where(eq(usageEventTable.subscriptionId, subscriptionId));
        } catch (error) {
            console.error("Error fetching usage summary:", error);
            return null;
        }
        return usageSummary || { totalTokensUsed: 0, totalRequests: 0 };
    },
    async recordUsageEvent(subscriptionId: number, requestId: string, inputTokens: number, outputTokens: number, reasoningTokens: number, cachedTokens: number, totalTokens: number) {
        try {
            await db.insert(usageEventTable).values({
                subscriptionId: subscriptionId,
                requestId: requestId,
                inputTokens,
                outputTokens,
                reasoningTokens,
                cachedTokens,
                requestStatus: "Succeeded",
            });
        } catch (error) {
            console.error("Error recording usage event:", error);
            throw error;
        }
    },
    async getUsageRollup(subscriptionId: number) {
        return (await db.select({
            totalTokens: sum(usageEventTable.totalTokens),
            outputTokens: sum(usageEventTable.outputTokens),
            inputTokens: sum(usageEventTable.inputTokens),
            reasoningTokens: sum(usageEventTable.reasoningTokens),
            cachedTokens: sum(usageEventTable.cachedTokens)
        })
            .from(usageEventTable)
            .where(eq(usageEventTable.subscriptionId, subscriptionId)))
    }
};

export default usageRepo;