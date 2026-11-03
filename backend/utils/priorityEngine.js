function getCalendarDate(value) {
    if (!value) return null;

    // MySQL DATE values normally arrive as YYYY-MM-DD.
    // Parse date-only values as UTC to avoid timezone shifts.
    const dateString =
        value instanceof Date
            ? value.toISOString().slice(0, 10)
            : String(value).slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return null;
    }

    const [year, month, day] = dateString.split("-").map(Number);

    const date = new Date(Date.UTC(year, month - 1, day));

    // Reject impossible calendar dates.
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }

    return date;
}

function calculatePriority(asset, coverage, hasOverlap = false) {
    const today = new Date();

    // Use today's local calendar date, then compare UTC calendar dates.
    const todayUTC = new Date(
        Date.UTC(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        )
    );

    const endDateUTC = getCalendarDate(coverage?.end_date);

    if (!endDateUTC) {
        return {
            score: 0,
            priority: "Unknown",
            days_remaining: null,
            explanation: {
                urgency_score: 0,
                urgency_reason: "Coverage end date is missing or invalid",
                value_score: 0,
                value_reason: "Asset value could not be evaluated",
                coverage_score: 0,
                coverage_reason: "Coverage situation could not be evaluated",
            },
        };
    }

    // Difference in whole calendar days.
    const daysRemaining = Math.round(
        (endDateUTC.getTime() - todayUTC.getTime()) /
            (1000 * 60 * 60 * 24)
    );

    // ==========================================
    // 1. EXPIRY URGENCY
    // ==========================================

    let urgencyScore;
    let urgencyReason;

    if (daysRemaining < 0) {
        urgencyScore = 50;
        urgencyReason = "Coverage has already lapsed";
    } else if (daysRemaining === 0) {
        urgencyScore = 50;
        urgencyReason = "Coverage ends today";
    } else if (daysRemaining <= 7) {
        urgencyScore = 50;
        urgencyReason = `Coverage ends in ${daysRemaining} days`;
    } else if (daysRemaining <= 30) {
        urgencyScore = 30;
        urgencyReason = `Coverage ends in ${daysRemaining} days`;
    } else if (daysRemaining <= 90) {
        urgencyScore = 15;
        urgencyReason = `Coverage ends in ${daysRemaining} days`;
    } else {
        urgencyScore = 5;
        urgencyReason = `Coverage has ${daysRemaining} days remaining`;
    }

    // ==========================================
    // 2. ASSET VALUE
    // ==========================================

    const purchaseValue = Number(asset?.purchase_value) || 0;

    let valueScore;
    let valueReason;

    if (purchaseValue > 50000) {
        valueScore = 25;
        valueReason = "Asset value is above ₹50,000";
    } else if (purchaseValue >= 10000) {
        valueScore = 15;
        valueReason = "Asset value is between ₹10,000 and ₹50,000";
    } else {
        valueScore = 5;
        valueReason = "Asset value is below ₹10,000";
    }

    // ==========================================
    // 3. COVERAGE SITUATION
    // ==========================================

    const coverageScore = hasOverlap ? 10 : 0;

    const coverageReason = hasOverlap
        ? "Potential coverage overlap detected"
        : "No potential coverage overlap detected";

    // ==========================================
    // 4. TOTAL SCORE
    // ==========================================

    const totalScore =
        urgencyScore +
        valueScore +
        coverageScore;

    // ==========================================
    // 5. PRIORITY CLASSIFICATION
    // ==========================================

    let priority;

    if (daysRemaining < 0) {
        priority = "Lapsed";
    } else if (daysRemaining <= 7) {
        priority = "Critical";
    } else if (totalScore >= 70) {
        priority = "Critical";
    } else if (totalScore >= 40) {
        priority = "Attention";
    } else {
        priority = "Safe";
    }

    // ==========================================
    // 6. EXPLANATION
    // ==========================================

    const explanation = {
        urgency_score: urgencyScore,
        urgency_reason: urgencyReason,

        value_score: valueScore,
        value_reason: valueReason,

        coverage_score: coverageScore,
        coverage_reason: coverageReason,
    };

    // ==========================================
    // 7. RESULT
    // ==========================================

    return {
        score: totalScore,
        priority,
        days_remaining: daysRemaining,
        explanation,
    };
}

module.exports = calculatePriority;