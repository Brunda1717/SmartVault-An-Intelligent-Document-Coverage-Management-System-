function calculatePriority(asset, coverage, hasOverlap) {

    // -----------------------------
    // 0. Calculate days remaining
    //    using calendar dates
    // -----------------------------

    // Get today's local calendar date
    const today = new Date();

    const todayDate =
        `${today.getFullYear()}-${String(
            today.getMonth() + 1
        ).padStart(2, "0")}-${String(
            today.getDate()
        ).padStart(2, "0")}`;

    // Convert YYYY-MM-DD into UTC midnight
    // This avoids timezone and time-of-day issues
    const todayUTC = new Date(
        `${todayDate}T00:00:00Z`
    );

    const endDateUTC = new Date(
        `${coverage.end_date}T00:00:00Z`
    );

    // Difference in whole calendar days
    const daysRemaining = Math.round(
        (endDateUTC - todayUTC) /
            (1000 * 60 * 60 * 24)
    );
    // -----------------------------
    // 1. Coverage urgency
    // -----------------------------

    let urgencyScore;
    let priorityStatus;

    if (daysRemaining < 0) {

        urgencyScore = 50;
        priorityStatus = "Lapsed";

    } else if (daysRemaining <= 7) {

        urgencyScore = 50;
        priorityStatus = "Critical";

    } else if (daysRemaining <= 30) {

        urgencyScore = 30;
        priorityStatus = "Attention";

    } else if (daysRemaining <= 90) {

        urgencyScore = 15;
        priorityStatus = "Attention";

    } else {

        urgencyScore = 5;
        priorityStatus = "Safe";

    }

    // -----------------------------
    // 2. Asset value
    // -----------------------------

    let valueScore;
    let valueReason;

    const purchaseValue =
        Number(asset.purchase_value) || 0;

    if (purchaseValue > 50000) {

        valueScore = 25;
        valueReason =
            "Asset value is above ₹50,000";

    } else if (purchaseValue >= 10000) {

        valueScore = 15;
        valueReason =
            "Asset value is between ₹10,000 and ₹50,000";

    } else {

        valueScore = 5;
        valueReason =
            "Asset value is below ₹10,000";

    }

    // -----------------------------
    // 3. Coverage situation
    // -----------------------------

    const coverageScore =
        hasOverlap ? 10 : 0;

    const coverageReason = hasOverlap
        ? "Potential coverage overlap detected"
        : "No potential coverage overlap detected";

    // -----------------------------
    // 4. Explain coverage urgency
    // -----------------------------

    let urgencyReason;

    if (daysRemaining < 0) {

        urgencyReason =
            "Coverage has already lapsed";

    } else if (daysRemaining === 0) {

        urgencyReason =
            "Coverage ends today";

    } else if (daysRemaining <= 7) {

        urgencyReason =
            `Coverage ends in ${daysRemaining} days`;

    } else if (daysRemaining <= 30) {

        urgencyReason =
            `Coverage ends in ${daysRemaining} days`;

    } else if (daysRemaining <= 90) {

        urgencyReason =
            `Coverage ends in ${daysRemaining} days`;

    } else {

        urgencyReason =
            `Coverage has ${daysRemaining} days remaining`;

    }

    // -----------------------------
    // 5. Calculate total score
    // -----------------------------

    const totalScore =
        urgencyScore +
        valueScore +
        coverageScore;

    // -----------------------------
    // 6. Determine priority
    // -----------------------------

    let priority;

    if (priorityStatus === "Lapsed") {

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

    // -----------------------------
    // 7. Explainable priority layer
    // -----------------------------

    const explanation = {

        urgency_score: urgencyScore,
        urgency_reason: urgencyReason,

        value_score: valueScore,
        value_reason: valueReason,

        coverage_score: coverageScore,
        coverage_reason: coverageReason

    };

    // -----------------------------
    // 8. Return result
    // -----------------------------

    return {

        score: totalScore,

        priority,

        days_remaining: daysRemaining,

        explanation

    };

}

module.exports = calculatePriority;