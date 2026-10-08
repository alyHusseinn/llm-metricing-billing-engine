import { db } from "../db";
import { planTable } from "../db/schema";
import { eq } from "drizzle-orm";

const planRepo = {
    async findPlanByName(planName: "Free" | "Pro"):
        Promise<{ id: number; name: string; priceInCents: number, tokensLimit: number, requestsLimit: number } | null> {
        const [plan] = await db.select()
            .from(planTable)
            .where(eq(planTable.name, planName))
            .limit(1);
        return plan || null;
    },
    async findPlanById(planId: number):
        Promise<{ id: number; name: string; priceInCents: number, tokensLimit: number, requestsLimit: number } | null> {
        const [plan] = await db.select()
            .from(planTable)
            .where(eq(planTable.id, planId))
            .limit(1);
        return plan || null;
    }
};

export default planRepo;