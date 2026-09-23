function calculatePriority(asset, coverage, hasOverlap) {
    const today = new Date();

    const endDate = new Date(coverage.end_date);

    const daysRemaining = Math.ceil(
        (endDate - today) / (1000 * 60 * 60 * 24)
    );

    let urgencyScore;

    if (daysRemaining < 0) {
        urgencyScore = 50;
    } else if (daysRemaining <= 7) {
        urgencyScore = 50;
    } else if (daysRemaining <= 30) {
        urgencyScore = 30;
    } else if (daysRemaining <= 90) {
        urgencyScore = 15;
    } else {
        urgencyScore = 5;
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

    // Priority bucket: score decides it, EXCEPT two hard overrides that
    // always win regardless of score — lapsed coverage, and anything
    // ending very soon. This stops a cheap-but-urgent item from being
    // diluted into "Attention" just because its value score was low.
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

    // Plain-language reasons — this is what actually makes the score
    // "explainable" rather than just a number breakdown.
    const reasons = [];
    if (daysRemaining < 0) {
        reasons.push(`Coverage lapsed ${Math.abs(daysRemaining)} day(s) ago`);
    } else {
        reasons.push(`Coverage ends in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`);
    }
    if (asset.purchase_value > 50000) {
        reasons.push(`High-value asset (₹${asset.purchase_value.toLocaleString("en-IN")})`);
    } else if (asset.purchase_value >= 10000) {
        reasons.push(`Moderate-value asset (₹${asset.purchase_value.toLocaleString("en-IN")})`);
    }
    if (hasOverlap) {
        reasons.push("Overlaps with another active coverage record");
    }

    return {
        score: totalScore,
        priority,
        days_remaining: daysRemaining,
        reasons,
        explanation: {
            urgency_score: urgencyScore,
            value_score: valueScore,
            coverage_score: coverageScore
        }
    };
}

module.exports = calculatePriority;