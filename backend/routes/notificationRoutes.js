const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const { runNotificationChecks } = require("../utils/notificationService");

const router = express.Router();

// GET /api/notifications  -> latest 50 + unread count
router.get("/", authMiddleware, async (req, res) => {
    try {
        const uid = req.user.user_id;
        const [notifications] = await db.query(
            `SELECT notification_id, asset_id, coverage_id, notification_type, severity,
                    title, message, is_read, email_status, created_at
             FROM notifications WHERE user_id = ?
             ORDER BY created_at DESC, notification_id DESC LIMIT 50`,
            [uid]
        );
        const [[{ unread }]] = await db.query(
            "SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0",
            [uid]
        );
        res.json({ unread, notifications });
    } catch (error) {
        console.error("Get notifications error:", error);
        res.status(500).json({ message: "Failed to load notifications" });
    }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", authMiddleware, async (req, res) => {
    try {
        await db.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.user.user_id]);
        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update notifications" });
    }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", authMiddleware, async (req, res) => {
    try {
        await db.query(
            "UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?",
            [req.params.id, req.user.user_id]
        );
        res.json({ message: "Marked as read" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update notification" });
    }
});

// DELETE /api/notifications/:id
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        await db.query(
            "DELETE FROM notifications WHERE notification_id = ? AND user_id = ?",
            [req.params.id, req.user.user_id]
        );
        res.json({ message: "Notification deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete notification" });
    }
});

// POST /api/notifications/check-now  -> run the checks for the logged-in user only
router.post("/check-now", authMiddleware, async (req, res) => {
    try {
        const created = await runNotificationChecks({ userId: req.user.user_id });
        res.json({ message: `Check complete. ${created} new notification(s).`, created });
    } catch (error) {
        console.error("Check-now error:", error);
        res.status(500).json({ message: "Failed to run check" });
    }
});

module.exports = router;