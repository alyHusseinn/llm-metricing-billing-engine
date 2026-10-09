import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { db } from '../db';
import alertsRepo from '../reposatory/alertsRepo';
import userRepo from '../reposatory/userRepo';
import { sendEmailNotification } from '../services/emailService';


/**
 * First parse the job data -> get the userId, subscriptionId, threshold
 * Then with drizzle find the user email -> call the send email function with the email and threshold
 */

const notificationWorker = new Worker('email-queue', async (job: Job) => {
    if (job.name === 'email-alert') {
        const { userId, subscriptionId, threshold } = job.data;

        // Fetch the user's email from the database using Drizzle ORM
        const user = await userRepo.getUserById(userId);

        if (!user) {
            console.log(`User with ID ${userId} not found`);
            throw new Error(`User with ID ${userId} not found`);
        }

        const userEmail = user.email;

        // Send the email notification
        const emailResult = await sendEmailNotification(userEmail, threshold);

        // Update the subscription to indicate email notification has been sent
        if(emailResult.accepted.length > 0) {
            await alertsRepo.insertAlert(subscriptionId, threshold);
        }
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