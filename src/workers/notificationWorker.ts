import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendEmailNotification } from '../services/emailService';


/**
 * First parse the job data -> get the userId, subscriptionId, threshold
 * Then with drizzle find the user email -> call the send email function with the email and threshold
 */

const notificationWorker = new Worker('email-queue', async (job: Job) => {
    if (job.name === 'email-alert') {
        const { userId, subscriptionId, threshold } = job.data;

        // Fetch the user's email from the database using Drizzle ORM
        const user = await db.select({ email: usersTable.email })
            .from(usersTable)
            .where(eq(usersTable.id, userId)).limit(1);

        if (!user || user.length === 0) {
            throw new Error(`User with ID ${userId} not found`);
        }

        const userEmail = user[0].email;

        // Send the email notification
        await sendEmailNotification(userEmail, threshold);
    }
}, {
    connection: redisConnection,
});

notificationWorker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
});

notificationWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} has failed with error: ${err.message}`);
});

// notificationWorker.run().catch(err => {
//     console.error('Error running the notification worker:', err);
// });