const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const findOverlaps = require("../utils/overlapChecker");
const calculatePriority = require("../utils/priorityEngine");

const router = express.Router();

// =========================
// ADD A NEW ASSET
// =========================

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
            (
                user_id,
                asset_name,
                category,
                brand,
                model,
                purchase_date,
                purchase_value
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.user_id,
                asset_name,
                category || null,
                brand || null,
                model || null,
                purchase_date || null,
                purchase_value || null
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

// =========================
// GET ALL ASSETS
// =========================

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

// =========================
// DASHBOARD DATA
// =========================

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

// =========================
// GET ONE ASSET BY ID
// =========================

router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const [assets] = await db.query(
            "SELECT * FROM assets WHERE asset_id = ? AND user_id = ?",
            [
                req.params.id,
                req.user.user_id
            ]
        );

        if (assets.length === 0) {
            return res.status(404).json({
                message: "Asset not found"
            });
        }

        res.json(assets[0]);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to load asset"
        });
    }
});

// =========================
// EDIT ASSET
// =========================

router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const {
            asset_name,
            category,
            brand,
            model,
            purchase_date,
            purchase_value
        } = req.body;

        // Check required asset name
        if (!asset_name || !asset_name.trim()) {
            return res.status(400).json({
                message: "Asset name is required"
            });
        }

        // Check asset ownership
        const [assets] = await db.query(
            `SELECT asset_id
             FROM assets
             WHERE asset_id = ?
             AND user_id = ?`,
            [
                req.params.id,
                req.user.user_id
            ]
        );

        if (assets.length === 0) {
            return res.status(404).json({
                message: "Asset not found"
            });
        }

        // Update asset details
        await db.query(
            `UPDATE assets
             SET
                asset_name = ?,
                category = ?,
                brand = ?,
                model = ?,
                purchase_date = ?,
                purchase_value = ?
             WHERE asset_id = ?
             AND user_id = ?`,
            [
                asset_name.trim(),
                category || null,
                brand || null,
                model || null,
                purchase_date || null,
                purchase_value || null,
                req.params.id,
                req.user.user_id
            ]
        );

        res.json({
            message: "Asset updated successfully"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update asset"
        });
    }
});

// =========================
// DELETE ASSET
// =========================

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        // Check asset ownership
        const [assets] = await db.query(
            `SELECT asset_id
             FROM assets
             WHERE asset_id = ?
             AND user_id = ?`,
            [
                req.params.id,
                req.user.user_id
            ]
        );

        if (assets.length === 0) {
            return res.status(404).json({
                message: "Asset not found"
            });
        }

        // Collect file paths BEFORE the cascade removes the document rows
        const [docs] = await db.query(
            "SELECT file_path FROM documents WHERE asset_id = ?",
            [req.params.id]
        );

        await db.query(
            "DELETE FROM assets WHERE asset_id = ? AND user_id = ?",
            [req.params.id, req.user.user_id]
        );

        // Remove the files from disk
        for (const doc of docs) {
            fs.unlink(path.resolve(doc.file_path), (err) => {
                if (err && err.code !== "ENOENT") console.error("File delete failed:", err);
            });
        }

        res.json({
            message: "Asset deleted successfully"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete asset"
        });
    }
});

module.exports = router;