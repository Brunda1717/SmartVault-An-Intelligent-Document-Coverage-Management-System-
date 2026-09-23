const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const findOverlaps = require("../utils/overlapChecker");
const calculatePriority = require("../utils/priorityEngine");

const router = express.Router();

// Add a new asset
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            asset_name,
            category,
            brand,
            model,
            purchase_date,
            purchase_value
        } = req.body;

        if (!asset_name) {
            return res.status(400).json({
                message: "Asset name is required"
            });
        }

        const [result] = await db.query(
            `INSERT INTO assets
            (user_id, asset_name, category, brand, model, purchase_date, purchase_value)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.user_id,
                asset_name,
                category,
                brand,
                model,
                purchase_date,
                purchase_value
            ]
        );

        res.status(201).json({
            message: "Asset added successfully",
            asset_id: result.insertId
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to add asset"
        });
    }
});

// Get all assets for logged-in user
router.get("/", authMiddleware, async (req, res) => {
    try {
        const [assets] = await db.query(
            "SELECT * FROM assets WHERE user_id = ? ORDER BY created_at DESC",
            [req.user.user_id]
        );

        res.json(assets);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch assets"
        });
    }
});

// Dashboard data
router.get("/dashboard", authMiddleware, async (req, res) => {
    try {
        const [assets] = await db.query(
            "SELECT * FROM assets WHERE user_id = ? ORDER BY created_at DESC",
            [req.user.user_id]
        );

        const dashboard = [];

        for (const asset of assets) {

            const [coverageList] = await db.query(
                "SELECT * FROM coverage WHERE asset_id = ? ORDER BY end_date ASC",
                [asset.asset_id]
            );

            const overlaps = findOverlaps(coverageList);

            const coverageData = coverageList.map((coverage) => {

                const hasOverlap = overlaps.some(
                    overlap =>
                        overlap.coverage_1 === coverage.coverage_id ||
                        overlap.coverage_2 === coverage.coverage_id
                );

                const priority = calculatePriority(
                    asset,
                    coverage,
                    hasOverlap
                );

                let reminder = null;
                if (priority.days_remaining <= 7) {
                    reminder = "Urgent: Coverage expires within 7 days";
                } else if (priority.days_remaining <= 30) {
                    reminder = "Reminder: Coverage expires within 30 days";
                }

                return {
                    coverage_id: coverage.coverage_id,
                    coverage_type: coverage.coverage_type,
                    provider: coverage.provider,
                    start_date: coverage.start_date,
                    end_date: coverage.end_date,
                    priority: priority,
                    reminder: reminder
                };
            });

            dashboard.push({
                asset: asset,
                coverage: coverageData,
                overlaps: overlaps
            });
        }

        res.json(dashboard);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to load dashboard"
        });
    }
});

module.exports = router;