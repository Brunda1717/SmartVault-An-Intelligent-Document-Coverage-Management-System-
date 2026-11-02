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

    // Validate date format
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

    // Check whether the asset belongs to the logged-in user
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
       (asset_id, coverage_type, provider, policy_number,
        start_date, end_date, status)
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

    // Check asset ownership
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
// Update a coverage record
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

    // Check ownership of coverage through its asset
    const [records] = await db.query(
      `SELECT c.coverage_id
       FROM coverage c
       JOIN assets a ON c.asset_id = a.asset_id
       WHERE c.coverage_id = ? AND a.user_id = ?`,
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
// Delete a coverage record
// ============================================
router.delete("/:coverage_id", authMiddleware, async (req, res) => {
  try {
    const { coverage_id } = req.params;

    // Check ownership
    const [records] = await db.query(
      `SELECT c.coverage_id
       FROM coverage c
       JOIN assets a ON c.asset_id = a.asset_id
       WHERE c.coverage_id = ? AND a.user_id = ?`,
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
// Get overlapping coverage records for an asset
// ============================================
router.get(
  "/asset/:asset_id/overlaps",
  authMiddleware,
  async (req, res) => {
    try {
      const { asset_id } = req.params;

      // Check ownership
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
// Get priority information for a coverage record
// ============================================
router.get(
  "/:coverage_id/priority",
  authMiddleware,
  async (req, res) => {
    try {
      const { coverage_id } = req.params;

      // Verify ownership
      const [records] = await db.query(
        `SELECT c.*, a.asset_name
         FROM coverage c
         JOIN assets a ON c.asset_id = a.asset_id
         WHERE c.coverage_id = ? AND a.user_id = ?`,
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

      const priority = calculatePriority(
        currentCoverage,
        overlaps
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
// Coverage dashboard summary
// ============================================
router.get("/dashboard/summary", authMiddleware, async (req, res) => {
  try {
    const [coverage] = await db.query(
      `SELECT c.*
       FROM coverage c
       JOIN assets a ON c.asset_id = a.asset_id
       WHERE a.user_id = ?`,
      [req.user.user_id]
    );

    const today = new Date().toISOString().split("T")[0];

    const summary = {
      Critical: 0,
      Attention: 0,
      Safe: 0,
      Lapsed: 0,
    };

    for (const record of coverage) {
      if (record.end_date < today) {
        summary.Lapsed++;
      } else {
        const priority = calculatePriority(record, []);

        if (summary[priority] !== undefined) {
          summary[priority]++;
        }
      }
    }

    res.json({
      total_coverage: coverage.length,
      summary,
    });
  } catch (error) {
    console.error("Coverage dashboard summary error:", error);

    res.status(500).json({
      message: "Failed to retrieve coverage summary",
    });
  }
});

module.exports = router;