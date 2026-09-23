function calculatePriority(asset, coverage, hasOverlap) {
    const today = new Date();

    const endDate = new Date(coverage.end_date);

    const daysRemaining = Math.ceil(
        (endDate - today) / (1000 * 60 * 60 * 24)
    );

    let urgencyScore;
    let priorityStatus;

    if (daysRemaining < 0) {
        urgencyScore = 50;
        priorityStatus = "Expired";
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

    let valueScore;

    if (asset.purchase_value > 50000) {
        valueScore = 25;
    } else if (asset.purchase_value >= 10000) {
        valueScore = 15;
    } else {
        valueScore = 5;
    }

    const coverageScore = hasOverlap ? 10 : 0;

    const totalScore =
        urgencyScore +
        valueScore +
        coverageScore;

    let priority;

    if (priorityStatus === "Expired") {
        priority = "Expired";
    } else if (totalScore >= 70) {
        priority = "Critical";
    } else if (totalScore >= 40) {
        priority = "Attention";
    } else {
        priority = "Safe";
    }

    return {
        score: totalScore,
        priority,
        days_remaining: daysRemaining,
        explanation: {
            urgency_score: urgencyScore,
            value_score: valueScore,
            coverage_score: coverageScore
        }
    };
}

module.exports = calculatePriority;