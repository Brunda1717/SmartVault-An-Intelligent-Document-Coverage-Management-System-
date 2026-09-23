const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const findOverlaps = require("../utils/overlapChecker");
const calculatePriority = require("../utils/priorityEngine");

const router = express.Router();

// Add coverage to an asset
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            asset_id,
            coverage_type,
            provider,
            policy_number,
            start_date,
            end_date
        } = req.body;

        if (!asset_id || !coverage_type || !start_date || !end_date) {
            return res.status(400).json({
                message:
                    "Asset ID, coverage type, start date and end date are required"
            });
        }

        // Validate date format
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;

        if (!datePattern.test(start_date) || !datePattern.test(end_date)) {
            return res.status(400).json({
                message: "Dates must be in YYYY-MM-DD format"
            });
        }

        // Validate that start date is not after end date
        if (start_date > end_date) {
            return res.status(400).json({
                message: "Start date cannot be after end date"
            });
        }

        // Verify that the asset belongs to the logged-in user
        const [assets] = await db.query(
            `SELECT asset_id
             FROM assets
             WHERE asset_id = ?
             AND user_id = ?`,
            [asset_id, req.user.user_id]
        );

        if (assets.length === 0) {
            return res.status(404).json({
                message: "Asset not found"
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
                end_date
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                asset_id,
                coverage_type,
                provider || null,
                policy_number || null,
                start_date,
                end_date
            ]
        );

        res.status(201).json({
            message: "Coverage added successfully",
            coverage_id: result.insertId
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to add coverage"
        });
    }
});

// Get coverage for an asset
router.get("/asset/:asset_id", authMiddleware, async (req, res) => {
    try {
        const { asset_id } = req.params;

        const [assets] = await db.query(
            `SELECT asset_id
             FROM assets
             WHERE asset_id = ?
             AND user_id = ?`,
            [asset_id, req.user.user_id]
        );

        if (assets.length === 0) {
            return res.status(404).json({
                message: "Asset not found"
            });
        }

        const [coverage] = await db.query(
            `SELECT *
             FROM coverage
             WHERE asset_id = ?
             ORDER BY end_date ASC`,
            [asset_id]
        );

        res.json(coverage);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch coverage"
        });
    }
});

// Check coverage overlaps for an asset
router.get(
    "/asset/:asset_id/overlaps",
    authMiddleware,
    async (req, res) => {
        try {
            const { asset_id } = req.params;

            const [assets] = await db.query(
                `SELECT asset_id
                 FROM assets
                 WHERE asset_id = ?
                 AND user_id = ?`,
                [asset_id, req.user.user_id]
            );

            if (assets.length === 0) {
                return res.status(404).json({
                    message: "Asset not found"
                });
            }

            const [coverage] = await db.query(
                `SELECT *
                 FROM coverage
                 WHERE asset_id = ?
                 ORDER BY start_date ASC`,
                [asset_id]
            );

            const overlaps = findOverlaps(coverage);

            res.json({
                asset_id: Number(asset_id),
                overlap_count: overlaps.length,
                overlaps: overlaps
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Failed to check coverage overlaps"
            });
        }
    }
);

// Calculate priority for coverage
router.get(
    "/:coverage_id/priority",
    authMiddleware,
    async (req, res) => {
        try {
            const { coverage_id } = req.params;

            const [rows] = await db.query(
                `SELECT
                    c.*,
                    a.asset_id,
                    a.asset_name,
                    a.purchase_value,
                    a.user_id
                 FROM coverage c
                 JOIN assets a
                 ON c.asset_id = a.asset_id
                 WHERE c.coverage_id = ?
                 AND a.user_id = ?`,
                [coverage_id, req.user.user_id]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "Coverage not found"
                });
            }

            const coverage = rows[0];

            const [allCoverage] = await db.query(
                `SELECT *
                 FROM coverage
                 WHERE asset_id = ?`,
                [coverage.asset_id]
            );

            const overlaps = findOverlaps(allCoverage);

            const hasOverlap = overlaps.some(
                (overlap) =>
                    overlap.coverage_1 === coverage.coverage_id ||
                    overlap.coverage_2 === coverage.coverage_id
            );

            const asset = {
                purchase_value: Number(coverage.purchase_value)
            };

            const priority = calculatePriority(
                asset,
                coverage,
                hasOverlap
            );

            res.json({
                coverage_id: coverage.coverage_id,
                asset_name: coverage.asset_name,
                ...priority
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Failed to calculate priority"
            });
        }
    }
);

module.exports = router;