const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const findOverlaps = require("../utils/overlapChecker");
const calculatePriority = require("../utils/priorityEngine");

const router = express.Router();

// ============================================
// POST /api/coverage
// Add new coverage
// ============================================
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            asset_id,
            coverage_type,
            provider,
            policy_number,
            start_date,
            end_date,
            status,
        } = req.body;

        if (!asset_id || !coverage_type || !start_date || !end_date) {
            return res.status(400).json({
                message: "Asset, coverage type, start date, and end date are required",
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
            return res.status(400).json({
                message: "Dates must be in YYYY-MM-DD format",
            });
        }

        if (start_date > end_date) {
            return res.status(400).json({
                message: "Start date cannot be after end date",
            });
        }

        const [assets] = await db.query(
            "SELECT asset_id FROM assets WHERE asset_id = ? AND user_id = ?",
            [asset_id, req.user.user_id]
        );

        if (assets.length === 0) {
            return res.status(404).json({
                message: "Asset not found",
            });
        }

        const [result] = await db.query(
            `INSERT INTO coverage
            (
                asset_id,
                coverage_type,
                provider,
                policy_number,
                start_date,
                end_date,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                asset_id,
                coverage_type,
                provider || null,
                policy_number || null,
                start_date,
                end_date,
                status || "Active",
            ]
        );

        res.status(201).json({
            message: "Coverage added successfully",
            coverage_id: result.insertId,
        });

    } catch (error) {
        console.error("Add coverage error:", error);

        res.status(500).json({
            message: "Failed to add coverage",
        });
    }
});

// ============================================
// GET /api/coverage/asset/:asset_id
// Get coverage records for an asset
// ============================================
router.get("/asset/:asset_id", authMiddleware, async (req, res) => {
    try {
        const { asset_id } = req.params;

        const [assets] = await db.query(
            "SELECT asset_id FROM assets WHERE asset_id = ? AND user_id = ?",
            [asset_id, req.user.user_id]
        );

        if (assets.length === 0) {
            return res.status(404).json({
                message: "Asset not found",
            });
        }

        const [coverage] = await db.query(
            "SELECT * FROM coverage WHERE asset_id = ? ORDER BY end_date ASC",
            [asset_id]
        );

        res.json(coverage);

    } catch (error) {
        console.error("Get coverage error:", error);

        res.status(500).json({
            message: "Failed to retrieve coverage",
        });
    }
});

// ============================================
// PUT /api/coverage/:coverage_id
// Update coverage
// ============================================
router.put("/:coverage_id", authMiddleware, async (req, res) => {
    try {
        const { coverage_id } = req.params;

        const {
            coverage_type,
            provider,
            policy_number,
            start_date,
            end_date,
            status,
        } = req.body;

        const [records] = await db.query(
            `SELECT c.coverage_id
             FROM coverage c
             JOIN assets a ON c.asset_id = a.asset_id
             WHERE c.coverage_id = ?
             AND a.user_id = ?`,
            [coverage_id, req.user.user_id]
        );

        if (records.length === 0) {
            return res.status(404).json({
                message: "Coverage not found",
            });
        }

        if (!coverage_type || !start_date || !end_date) {
            return res.status(400).json({
                message: "Coverage type, start date, and end date are required",
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
            return res.status(400).json({
                message: "Dates must be in YYYY-MM-DD format",
            });
        }

        if (start_date > end_date) {
            return res.status(400).json({
                message: "Start date cannot be after end date",
            });
        }

        await db.query(
            `UPDATE coverage
             SET coverage_type = ?,
                 provider = ?,
                 policy_number = ?,
                 start_date = ?,
                 end_date = ?,
                 status = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE coverage_id = ?`,
            [
                coverage_type,
                provider || null,
                policy_number || null,
                start_date,
                end_date,
                status || "Active",
                coverage_id,
            ]
        );

        res.json({
            message: "Coverage updated successfully",
        });

    } catch (error) {
        console.error("Update coverage error:", error);

        res.status(500).json({
            message: "Failed to update coverage",
        });
    }
});

// ============================================
// DELETE /api/coverage/:coverage_id
// Delete coverage
// ============================================
router.delete("/:coverage_id", authMiddleware, async (req, res) => {
    try {
        const { coverage_id } = req.params;

        const [records] = await db.query(
            `SELECT c.coverage_id
             FROM coverage c
             JOIN assets a ON c.asset_id = a.asset_id
             WHERE c.coverage_id = ?
             AND a.user_id = ?`,
            [coverage_id, req.user.user_id]
        );

        if (records.length === 0) {
            return res.status(404).json({
                message: "Coverage not found",
            });
        }

        await db.query(
            "DELETE FROM coverage WHERE coverage_id = ?",
            [coverage_id]
        );

        res.json({
            message: "Coverage deleted successfully",
        });

    } catch (error) {
        console.error("Delete coverage error:", error);

        res.status(500).json({
            message: "Failed to delete coverage",
        });
    }
});

// ============================================
// GET /api/coverage/asset/:asset_id/overlaps
// Get overlapping coverage records
// ============================================
router.get(
    "/asset/:asset_id/overlaps",
    authMiddleware,
    async (req, res) => {
        try {
            const { asset_id } = req.params;

            const [assets] = await db.query(
                "SELECT asset_id FROM assets WHERE asset_id = ? AND user_id = ?",
                [asset_id, req.user.user_id]
            );

            if (assets.length === 0) {
                return res.status(404).json({
                    message: "Asset not found",
                });
            }

            const [coverage] = await db.query(
                "SELECT * FROM coverage WHERE asset_id = ?",
                [asset_id]
            );

            const overlaps = findOverlaps(coverage);

            res.json({
                asset_id,
                overlap_count: overlaps.length,
                overlaps,
            });

        } catch (error) {
            console.error("Get coverage overlaps error:", error);

            res.status(500).json({
                message: "Failed to retrieve coverage overlaps",
            });
        }
    }
);

// ============================================
// GET /api/coverage/:coverage_id/priority
// Get priority for a coverage record
// ============================================
router.get(
    "/:coverage_id/priority",
    authMiddleware,
    async (req, res) => {
        try {
            const { coverage_id } = req.params;

            const [records] = await db.query(
                `SELECT
                    c.*,
                    a.asset_name,
                    a.purchase_value
                 FROM coverage c
                 JOIN assets a ON c.asset_id = a.asset_id
                 WHERE c.coverage_id = ?
                 AND a.user_id = ?`,
                [coverage_id, req.user.user_id]
            );

            if (records.length === 0) {
                return res.status(404).json({
                    message: "Coverage not found",
                });
            }

            const currentCoverage = records[0];

            const [allCoverage] = await db.query(
                "SELECT * FROM coverage WHERE asset_id = ?",
                [currentCoverage.asset_id]
            );

            const overlaps = findOverlaps(allCoverage);

            const hasOverlap = overlaps.some(
                (overlap) =>
                    Number(overlap.coverage_1) ===
                        Number(currentCoverage.coverage_id) ||
                    Number(overlap.coverage_2) ===
                        Number(currentCoverage.coverage_id)
            );

            const priority = calculatePriority(
                currentCoverage,
                currentCoverage,
                hasOverlap
            );

            res.json({
                coverage_id: currentCoverage.coverage_id,
                asset_name: currentCoverage.asset_name,
                ...priority,
            });

        } catch (error) {
            console.error("Get coverage priority error:", error);

            res.status(500).json({
                message: "Failed to retrieve coverage priority",
            });
        }
    }
);

// ============================================
// GET /api/coverage/dashboard/summary
// Dashboard summary
// ============================================
router.get(
    "/dashboard/summary",
    authMiddleware,
    async (req, res) => {
        try {
            // Fetch all coverage belonging to this user.
            const [coverage] = await db.query(
                `SELECT
                    c.*,
                    a.asset_name,
                    a.purchase_value
                 FROM coverage c
                 JOIN assets a ON c.asset_id = a.asset_id
                 WHERE a.user_id = ?
                 ORDER BY c.end_date ASC`,
                [req.user.user_id]
            );

            const summary = {
                Critical: 0,
                Attention: 0,
                Safe: 0,
                Lapsed: 0,
                Unknown: 0,
            };

            const priorityItems = [];

            let totalOverlaps = 0;
            const overlapItems = [];

            // Group coverage records by asset.
            const coverageByAsset = {};

            for (const record of coverage) {
                const assetId = record.asset_id;

                if (!coverageByAsset[assetId]) {
                    coverageByAsset[assetId] = [];
                }

                coverageByAsset[assetId].push(record);
            }

            // Calculate priority and overlaps for each asset.
            for (const assetCoverage of Object.values(coverageByAsset)) {
                const overlaps = findOverlaps(assetCoverage);

                totalOverlaps += overlaps.length;

                for (const overlap of overlaps) {
                    overlapItems.push({
                        asset_id: assetCoverage[0].asset_id,
                        asset_name: assetCoverage[0].asset_name,
                        ...overlap,
                    });
                }

                for (const record of assetCoverage) {
                    const hasOverlap = overlaps.some(
                        (overlap) =>
                            Number(overlap.coverage_1) ===
                                Number(record.coverage_id) ||
                            Number(overlap.coverage_2) ===
                                Number(record.coverage_id)
                    );

                    const priority = calculatePriority(
                        record,
                        record,
                        hasOverlap
                    );

                    const priorityName = priority.priority;

                    if (summary[priorityName] !== undefined) {
                        summary[priorityName]++;
                    } else {
                        summary.Unknown++;
                    }

                    // Include coverage record and calculated priority.
                    priorityItems.push({
                        ...record,
                        ...priority,
                    });
                }
            }

            // Separate lists for the Dashboard cards and priority center.
            const buckets = {
                Critical: priorityItems.filter(
                    (item) => item.priority === "Critical"
                ),

                Attention: priorityItems.filter(
                    (item) => item.priority === "Attention"
                ),

                Safe: priorityItems.filter(
                    (item) => item.priority === "Safe"
                ),

                Lapsed: priorityItems.filter(
                    (item) => item.days_remaining < 0
                ),

                Unknown: priorityItems.filter(
                    (item) => ![
                        "Critical",
                        "Attention",
                        "Safe",
                    ].includes(item.priority)
                ),
            };

            return res.json({
                total_coverage: coverage.length,
                total_overlaps: totalOverlaps,
                overlaps: overlapItems,

                // Numeric counts for cards and health summary.
                summary,

                // Coverage records for dashboard priority lists.
                buckets,

                // All coverage records with priority information.
                priorityItems,
            });

        } catch (error) {
            console.error("Coverage dashboard summary error:", error);

            res.status(500).json({
                message: "Failed to retrieve coverage summary",
            });
        }
    }
);

module.exports = router;