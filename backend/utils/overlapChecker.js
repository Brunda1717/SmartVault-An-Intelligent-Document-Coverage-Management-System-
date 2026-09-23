function findOverlaps(coverageList) {
    const overlaps = [];

    for (let i = 0; i < coverageList.length; i++) {
        for (let j = i + 1; j < coverageList.length; j++) {

            const first = coverageList[i];
            const second = coverageList[j];

            const firstStart = new Date(first.start_date);
            const firstEnd = new Date(first.end_date);

            const secondStart = new Date(second.start_date);
            const secondEnd = new Date(second.end_date);

            if (
                firstStart <= secondEnd &&
                secondStart <= firstEnd
            ) {
                // The actual overlapping window — later start, earlier end.
                const overlapStart = firstStart > secondStart ? firstStart : secondStart;
                const overlapEnd = firstEnd < secondEnd ? firstEnd : secondEnd;
                const overlapDays = Math.round((overlapEnd - overlapStart) / 86400000) + 1;

                overlaps.push({
                    coverage_1: first.coverage_id,
                    coverage_1_type: first.coverage_type,
                    coverage_2: second.coverage_id,
                    coverage_2_type: second.coverage_type,
                    overlap_start: overlapStart.toISOString().slice(0, 10),
                    overlap_end: overlapEnd.toISOString().slice(0, 10),
                    overlap_days: overlapDays,
                    message: `"${first.coverage_type}" and "${second.coverage_type}" both apply from ` +
                             `${overlapStart.toISOString().slice(0, 10)} to ${overlapEnd.toISOString().slice(0, 10)} ` +
                             `(${overlapDays} days). This does not necessarily mean duplicate coverage — review what each actually covers.`
                });
            }
        }
    }

    return overlaps;
}

module.exports = findOverlaps;