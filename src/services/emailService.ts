import nodemailer from "nodemailer";
import {env} from "../utils/env"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const sendEmailNotification = async (to: string, threshold: number) => {
  const mailOptions = {
    from: env.MAIL_FROM,   
    to,
    subject: "Threat Alert: Your Subscription Token Usage",
    html: `
        <p>Dear User,</p>
        <p>We wanted to inform you that your subscription token usage has reached ${threshold}% of your limit.</p>
        <p>Please consider upgrading your subscription or managing your usage to avoid any service interruptions.</p>
        <p>Thank you for using our service!</p>
  `,
  };
    await transporter.sendMail(mailOptions);
};