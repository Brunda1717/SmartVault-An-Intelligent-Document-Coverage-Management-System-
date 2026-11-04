const cron = require("node-cron");
const { runNotificationChecks } = require("./notificationService");

const TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";

function startScheduler() {
    // Every day at 9:00 AM
    cron.schedule(
        "0 9 * * *",
        () => runNotificationChecks().catch((e) => console.error("Scheduler error:", e)),
        { timezone: TZ }
    );

    // Catch-up run shortly after the server starts (safe: duplicates are blocked)
    setTimeout(
        () => runNotificationChecks().catch((e) => console.error("Startup check error:", e)),
        5000
    );

    console.log("Notification scheduler started (daily at 9:00 AM)");
}

module.exports = { startScheduler };