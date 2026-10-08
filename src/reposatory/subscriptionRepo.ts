import { subscriptionTable, planTable } from "../db/schema";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";


const subscriptionRepo = {
    async createFreesub(userId: number): Promise<{ id: number; userId: number; planId: number; status: string }> {
        // First, find the plan ID based on the plan name
        const [plan] = await db.select({ id: planTable.id }).from(planTable).where(eq(planTable.name, "Free")).limit(1);
        if (!plan) {
            throw new Error(`Plan not found: Free`);
        }

        const [subscription] = await db.insert(subscriptionTable)
            .values({ userId, planId: plan.id, status: "Active" })
            .returning({ id: subscriptionTable.id, userId: subscriptionTable.userId, planId: subscriptionTable.planId, status: subscriptionTable.status });
        return subscription;
    },
    async createProsub(userId: number): Promise<{ id: number; userId: number; planId: number; status: string }> {
        // First, find the plan ID based on the plan name
        const [plan] = await db.select({ id: planTable.id }).from(planTable).where(eq(planTable.name, "Pro")).limit(1);
        if (!plan) {
            throw new Error(`Plan not found: Pro`);
        }
        const [subscription] = await db.insert(subscriptionTable)
            .values({ userId, planId: plan.id, status: "Active" })
            .returning({ id: subscriptionTable.id, userId: subscriptionTable.userId, planId: subscriptionTable.planId, status: subscriptionTable.status });
        return subscription;
    },
    async findActiveSubscriptionByUserId(userId: number): Promise<{ id: number; userId: number; planId: number; status: string, startDate: Date } | null> {
        const [subscription] = await db.select({ id: subscriptionTable.id, userId: subscriptionTable.userId, planId: subscriptionTable.planId, status: subscriptionTable.status, startDate: subscriptionTable.startDate })
            .from(subscriptionTable)
            .where(and(eq(subscriptionTable.userId, userId), eq(subscriptionTable.status, "Active")))
            .limit(1);
        return subscription || null;
    },
    async updateSubscriptionStatus(subscriptionId: number, status: "Past_due" | "Limit_Exceeded" | "Canceled"): Promise<void> {
        await db.update(subscriptionTable)
            .set({ status })
            .where(eq(subscriptionTable.id, subscriptionId));
    },
    async findCurrentNotActiveSub(userId: number): Promise<{ id: number; userId: number; planId: number; status: string, startDate: Date }> {
        const [subscription] = await db.select()
            .from(subscriptionTable)
            .where(eq(subscriptionTable.userId, userId!))
            .orderBy(desc(subscriptionTable.updatedAt)).limit(1);
        return subscription;
    }
}

export default subscriptionRepo;