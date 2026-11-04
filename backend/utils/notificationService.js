const db = require("../db");
const sendEmail = require("./mailer");
const findOverlaps = require("./overlapChecker");

const TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";
const APP_URL = process.env.APP_URL || "http://localhost:5173";

// ---------- date helpers (all based on YYYY-MM-DD strings) ----------
const toDateStr = (v) =>
    typeof v === "string" ? v.slice(0, 10) : new Date(v).toLocaleDateString("en-CA");

const todayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });

const dayNum = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86400000;
};

const fmt = (s) =>
    new Date(s + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
    });

const hoursLeftToday = () => {
    const h = Number(
        new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" })
            .format(new Date())
    );
    return Math.max(1, 24 - h);
};

const esc = (s) =>
    String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

// ---------- which reminder applies for "days left"? ----------
function expiryStage(daysLeft) {
    if (daysLeft > 30) return null;
    if (daysLeft >= 16) return { key: "30d", severity: "info" };
    if (daysLeft >= 8) return { key: "15d", severity: "warning" };
    if (daysLeft >= 1) return { key: `${daysLeft}d`, severity: "critical" }; // 7..1 daily
    if (daysLeft === 0) return { key: "today", severity: "critical" };
    if (daysLeft >= -7) return { key: "expired", severity: "critical" };    // ignore very old expiries
    return null;
}

function buildExpiryText(c, daysLeft, stage) {
    const what = `${c.coverage_type} for ${c.asset_name}`;
    const end = fmt(toDateStr(c.end_date));

    if (stage === "expired") {
        return {
            title: `Coverage ended: ${c.coverage_type} (${c.asset_name})`,
            message: `Your ${what} coverage ended on ${end}. Consider renewing it or arranging new coverage.`,
        };
    }

    if (stage === "today") {
        const h = hoursLeftToday();
        return {
            title: `Coverage ends today: ${c.coverage_type} (${c.asset_name})`,
            message: `Your ${what} coverage ends today (${end}), in approximately ${h} hour${h === 1 ? "" : "s"}. Consider renewing it to maintain continuous protection.`,
        };
    }

    const d = `${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

    const hint =
        stage === "30d" ? "Start exploring renewal options."
        : stage === "15d" ? "Review your options: renew, replace or let it end."
        : "Consider renewing or arranging new coverage soon.";

    return {
        title: `Coverage ends in ${d}: ${c.coverage_type} (${c.asset_name})`,
        message: `Your ${what} coverage ends on ${end} (${d} remaining). ${hint}`,
    };
}
const emailHtml = (title, message, assetId) => `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="margin-top:0;color:#111827">${esc(title)}</h2>
  <p style="color:#374151;line-height:1.6">${esc(message)}</p>
  <a href="${APP_URL}/asset/${assetId}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open in SmartVault</a>
  <p style="color:#9ca3af;font-size:12px;margin-top:24px">You receive this because you track your coverage with SmartVault.</p>
</div>`;

// ---------- create the in-app notification + send the email (once) ----------
async function notify({ user, assetId, coverageId, type, severity, title, message, key }) {

    const [result] = await db.query(
        `INSERT IGNORE INTO notifications
         (user_id, asset_id, coverage_id, notification_type, severity, title, message, dedupe_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [user.user_id, assetId, coverageId || null, type, severity, title, message, key]
    );

    let notificationId;

    if (result.affectedRows > 0) {
        notificationId = result.insertId;
    } else {
        const [existing] = await db.query(
            `SELECT notification_id
             FROM notifications
             WHERE dedupe_key = ?`,
            [key]
        );

        if (!existing.length) return false;

        notificationId = existing[0].notification_id;
    }

    // Claim the notification so concurrent checks cannot send it twice.
    const [claim] = await db.query(
        `UPDATE notifications
         SET email_status = 'sending'
         WHERE notification_id = ?
         AND email_status IN ('pending', 'failed')`,
        [notificationId]
    );

    if (claim.affectedRows === 0) return false;

    const status = await sendEmail({
        to: user.email,
        subject: `SmartVault: ${title}`,
        text: `${message}\n\nOpen SmartVault: ${APP_URL}/asset/${assetId}`,
        html: emailHtml(title, message, assetId),
    });

    await db.query(
        `UPDATE notifications
         SET email_status = ?
         WHERE notification_id = ?`,
        [status, notificationId]
    );

    return true;
}
// ---------- main job: expiry reminders + overlap alerts ----------
async function runNotificationChecks({ userId = null, assetId = null } = {}) {
    let sql = `SELECT c.*, a.asset_name, a.user_id, u.email
               FROM coverage c
               JOIN assets a ON c.asset_id = a.asset_id
               JOIN users u ON a.user_id = u.user_id
               WHERE 1 = 1`;
    const params = [];
    if (userId) { sql += " AND a.user_id = ?"; params.push(userId); }
    if (assetId) { sql += " AND a.asset_id = ?"; params.push(assetId); }

    const [rows] = await db.query(sql, params);
    const today = todayStr();
    const todayNum = dayNum(today);
    const byAsset = {};
    let created = 0;

    // 1) expiry reminders
    for (const c of rows) {
        if (!byAsset[c.asset_id]) byAsset[c.asset_id] = [];
        byAsset[c.asset_id].push(c);

        const end = toDateStr(c.end_date);
        const daysLeft = dayNum(end) - todayNum;
        const stage = expiryStage(daysLeft);
        if (!stage) continue;

        const text = buildExpiryText(c, daysLeft, stage.key);
        const sent = await notify({
            user: c,
            assetId: c.asset_id,
            coverageId: c.coverage_id,
            type: stage.key === "expired" ? "expired" : "expiry",
            severity: stage.severity,
            title: text.title,
            message: text.message,
            key: `expiry:${c.coverage_id}:${end}:${stage.key}`,
        });
        if (sent) created++;
    }

    // 2) overlap alerts (only overlaps that are still current or upcoming)
    for (const list of Object.values(byAsset)) {
        const overlaps = findOverlaps(list);

        for (const o of overlaps) {
            if (o.overlap_end < today) continue;

            const low = Math.min(o.coverage_1, o.coverage_2);
            const high = Math.max(o.coverage_1, o.coverage_2);
            const owner = list[0];

            const sent = await notify({
                user: owner,
                assetId: owner.asset_id,
                coverageId: null,
                type: "overlap",
                severity: "warning",
                title: `Overlap detected: ${owner.asset_name}`,
                message:
                    `${o.coverage_1_type} and ${o.coverage_2_type} for ${owner.asset_name} both apply ` +
                    `from ${fmt(o.overlap_start)} to ${fmt(o.overlap_end)} (${o.overlap_days} days). ` +
                    `This can be normal (for example warranty + accident cover) or a duplicate. Open the asset to see what to do.`,
                key: `overlap:${owner.asset_id}:${low}-${high}:${o.overlap_start}:${o.overlap_end}`,
            });
            if (sent) created++;
        }
    }

    return created;
}

module.exports = { runNotificationChecks };