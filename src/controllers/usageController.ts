import { subscriptionTable } from "../db/schema";
import { db } from "../db";
import { desc, eq } from "drizzle-orm";
import { AuthRequest } from "../middleware/authenticate";
import { Response } from "express";
import subscriptionRepo from "../reposatory/subscriptionRepo";
import usageRepo from "../reposatory/usageRepo";
import planRepo from "../reposatory/planRepo";


/**
 * Usage Rollup
 * -> returns the used, limit, cost
 */

const rollupUsage = async (req: AuthRequest, res: Response) => {
    /**
     * Find active sub? get usage by it : find the last one and return usage
     */

    try {
        let sub = await subscriptionRepo.findActiveSubscriptionByUserId(req.userId!);

        if (!sub) {
            // find the last sub by the user and Rollup the usage events
            sub = await subscriptionRepo.findCurrentNotActiveSub(req.userId!);
        }

        const plan = await planRepo.findPlanById(sub.planId);

        console.log(plan)

        const limit = plan!.tokensLimit!;
        let [usage] = await usageRepo.getUsageRollup(sub.id);

        const costInCents = (Number(usage.totalTokens) / limit) * plan!.priceInCents

        console.log(usage.totalTokens, limit, plan!.priceInCents, costInCents)

        res.status(200).json({
            limit,
            usage,
            costInCents
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