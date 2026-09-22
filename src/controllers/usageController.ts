import { usageEventTable, subscriptionTable, planTable } from "../db/schema";
import { env } from "../utils/env"
import { db } from "../db"
import { desc, eq, sum } from "drizzle-orm";
import { AuthRequest } from "../middleware/authenticate";
import { Response } from "express";


/**
 * Usage Rollup
 * -> returns the used, limit, cost
 */

const rollupUsage = async (req: AuthRequest, res: Response) => {
    /**
     * Find active sub? get usage by it : find the last one and return usage
     */

    try {
        let [sub] = await db.select()
            .from(subscriptionTable)
            .where(eq(subscriptionTable.status, "Active"));

        if (!sub) {
            // find the last sub and Rollup the usage events
            const [notActiveSub] = await db.select()
                .from(subscriptionTable)
                .orderBy(desc(subscriptionTable.updatedAt));

            sub = notActiveSub;
        }

        const [plan] = await db.select()
            .from(planTable)
            .where(eq(planTable.id, sub.planId));

        const limit = plan.tokensLimit;
        const cost = plan.priceInCents;
        const [used] = await db.select({ tokensUsed: sum(usageEventTable.totalTokens) })
            .from(usageEventTable)
            .where(eq(usageEventTable.subscriptionId, sub.id))

        res.status(200).json({
            limit,
            used: used.tokensUsed,
            cost
        })
        return;

    } catch (error) {
        console.error("Usage Rollup Error:", error);
        res.status(500).json({
            error: "Internal server error rollup usage",
            code: "INTERNAL_ERROR",
        });

    }
}

export default {
    rollupUsage
}