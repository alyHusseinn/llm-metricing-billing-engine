import { addEmailJob } from "../services/email.queue";
import alertsRepo from "../reposatory/alertsRepo";

const pushNotificationToQueue = async (remainingTokens: number, planTokensLimit: number, data: { userId: number, subscriptionId: number }) => {
    const { userId, subscriptionId } = data;
    if (remainingTokens <= 0) { // User used 100% of their quota
        const alertSent = await alertsRepo.hasAlertSent(subscriptionId, "100");
        if (!alertSent) {
            await addEmailJob(userId!, subscriptionId, 100);
        }
        return;
    } else if (remainingTokens <= (planTokensLimit * 0.2)) { // User used 80% of their quota
        const alertSent = await alertsRepo.hasAlertSent(subscriptionId, "80");
        if (!alertSent) {
            await addEmailJob(userId!, subscriptionId, 80);
        }
    }
}

export default pushNotificationToQueue;