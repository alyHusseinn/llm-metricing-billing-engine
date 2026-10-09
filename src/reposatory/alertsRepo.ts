import { alertsTable } from "../db/schema";
import { db } from "../db";
import { eq, and } from "drizzle-orm";


const alertsRepo = {
    async insertAlert(subscriptionId: number, threshold: "80" | "100"): Promise<void> {
        await db.insert(alertsTable)
            .values({ subscriptionId, threshold })
            .execute();
    },
    async hasAlertSent(subscriptionId: number, threshold: "80" | "100"): Promise<boolean> {
        const [alert] = await db.select({ id: alertsTable.id })
            .from(alertsTable)
            .where(and(eq(alertsTable.subscriptionId, subscriptionId), eq(alertsTable.threshold, threshold)))
            .limit(1);
        return !!alert?.id;
    }
}

export default alertsRepo;