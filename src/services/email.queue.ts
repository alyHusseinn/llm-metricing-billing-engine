import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const emailQueue = new Queue('email-queue', { 
  connection: redisConnection 
});

/**
 * Adds an email job to the queue
 */

export async function addEmailJob(userId: number, subscriptionId: number, threshold: 80 | 100): Promise<void> {
  await emailQueue.add(
    'email-alert', 
    { userId, subscriptionId, threshold },
    {
      attempts: 5, 
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true, 
    }
  );
}
