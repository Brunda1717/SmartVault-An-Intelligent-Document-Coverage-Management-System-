const nodemailer = require("nodemailer");
require("dotenv").config();

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
}

// Returns "sent" | "failed" | "skipped". Never throws, so an email problem
// can never break adding a coverage or crash the scheduler.
async function sendEmail({ to, subject, text, html }) {
    if (!transporter) {
        console.log(`[email skipped - SMTP not configured] to=${to} | ${subject}`);
        return "skipped";
    }
    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to, subject, text, html,
        });
        return "sent";
    } catch (err) {
        console.error("Email failed:", err.message);
        return "failed";
    }
}

module.exports = sendEmail;