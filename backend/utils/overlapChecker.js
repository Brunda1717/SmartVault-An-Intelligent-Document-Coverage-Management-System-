// Turns "2024-03-15" (or a Date) into a UTC-midnight timestamp.
// UTC avoids the one-day shift that happens for users outside UTC (e.g. India).
function toDay(value) {
    if (typeof value === "string") {
        const [y, m, d] = value.slice(0, 10).split("-").map(Number);
        return Date.UTC(y, m - 1, d);
    }
    const dt = new Date(value);
    return Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

function findOverlaps(coverageList) {
    const overlaps = [];

    for (let i = 0; i < coverageList.length; i++) {
        for (let j = i + 1; j < coverageList.length; j++) {
            const first = coverageList[i];
            const second = coverageList[j];

            const firstStart = toDay(first.start_date);
            const firstEnd = toDay(first.end_date);
            const secondStart = toDay(second.start_date);
            const secondEnd = toDay(second.end_date);

            // Skip records whose own dates are invalid (start after end).
            if (firstStart > firstEnd || secondStart > secondEnd) {
                console.warn(
                    `Skipping overlap check: coverage ${first.coverage_id} or ` +
                    `${second.coverage_id} has start_date after end_date.`
                );
                continue;
            }

            if (firstStart <= secondEnd && secondStart <= firstEnd) {
                // The overlapping window: later start, earlier end.
                const overlapStart = Math.max(firstStart, secondStart);
                const overlapEnd = Math.min(firstEnd, secondEnd);
                const overlapDays = Math.round((overlapEnd - overlapStart) / 86400000) + 1;

                overlaps.push({
                    coverage_1: first.coverage_id,
                    coverage_1_type: first.coverage_type,
                    coverage_1_provider: first.provider || null,
                    coverage_1_start: iso(firstStart),
                    coverage_1_end: iso(firstEnd),

                    coverage_2: second.coverage_id,
                    coverage_2_type: second.coverage_type,
                    coverage_2_provider: second.provider || null,
                    coverage_2_start: iso(secondStart),
                    coverage_2_end: iso(secondEnd),

                    overlap_start: iso(overlapStart),
                    overlap_end: iso(overlapEnd),
                    overlap_days: overlapDays,

                    message:
                        `"${first.coverage_type}" and "${second.coverage_type}" both apply from ` +
                        `${iso(overlapStart)} to ${iso(overlapEnd)} (${overlapDays} days). ` +
                        `This does not necessarily mean duplicate coverage — review what each actually covers.`,
                });
            }
        }
    }

    return overlaps;
}

module.exports = findOverlaps;