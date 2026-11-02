const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================
// Multer configuration
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, and PNG files are allowed"));
    }
  },
});

// ============================================
// POST /api/documents
// Upload a document
// ============================================
router.post(
  "/",
  authMiddleware,
  upload.single("document"),
  async (req, res) => {
    try {
      const {
        asset_id,
        coverage_id,
        document_type,
      } = req.body;

      if (!asset_id || !document_type || !req.file) {
        return res.status(400).json({
          message: "Asset, document type, and file are required",
        });
      }

      // Check asset ownership
      const [assets] = await db.query(
        "SELECT asset_id FROM assets WHERE asset_id = ? AND user_id = ?",
        [asset_id, req.user.user_id]
      );

      if (assets.length === 0) {
        // Remove uploaded file if asset is invalid
        fs.unlink(req.file.path, () => {});

        return res.status(404).json({
          message: "Asset not found",
        });
      }

      // If coverage_id was provided, verify it belongs to this asset
      if (coverage_id) {
        const [coverage] = await db.query(
          `SELECT coverage_id
           FROM coverage
           WHERE coverage_id = ? AND asset_id = ?`,
          [coverage_id, asset_id]
        );

        if (coverage.length === 0) {
          fs.unlink(req.file.path, () => {});

          return res.status(400).json({
            message: "Coverage does not belong to this asset",
          });
        }
      }

      const [result] = await db.query(
        `INSERT INTO documents
         (asset_id, coverage_id, document_type, file_name,
          file_path, file_size, ocr_status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          asset_id,
          coverage_id || null,
          document_type,
          req.file.originalname,
          req.file.path,
          req.file.size,
          "Pending",
        ]
      );

      res.status(201).json({
        message: "Document uploaded successfully",
        document_id: result.insertId,
      });
    } catch (error) {
      console.error("Upload document error:", error);

      // Remove file if DB insertion failed
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }

      res.status(500).json({
        message: "Failed to upload document",
      });
    }
  }
);

// ============================================
// GET /api/documents/asset/:asset_id
// Get documents belonging to an asset
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

    const [documents] = await db.query(
      `SELECT document_id, asset_id, coverage_id, document_type,
              file_name, file_size, ocr_status, uploaded_at, created_at
       FROM documents
       WHERE asset_id = ?
       ORDER BY uploaded_at DESC`,
      [asset_id]
    );

    res.json(documents);
  } catch (error) {
    console.error("Get documents error:", error);

    res.status(500).json({
      message: "Failed to retrieve documents",
    });
  }
});

// ============================================
// GET /api/documents/:document_id/view
// View or download a document
// ============================================
router.get(
  "/:document_id/view",
  authMiddleware,
  async (req, res) => {
    try {
      const { document_id } = req.params;

      // Verify document ownership
      const [documents] = await db.query(
        `SELECT d.file_path, d.file_name
         FROM documents d
         JOIN assets a ON d.asset_id = a.asset_id
         WHERE d.document_id = ? AND a.user_id = ?`,
        [document_id, req.user.user_id]
      );

      if (documents.length === 0) {
        return res.status(404).json({
          message: "Document not found",
        });
      }

      const filePath = path.resolve(documents[0].file_path);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          message: "Document file is missing from storage",
        });
      }

      res.sendFile(filePath);
    } catch (error) {
      console.error("View document error:", error);

      res.status(500).json({
        message: "Failed to view document",
      });
    }
  }
);

// ============================================
// DELETE /api/documents/:document_id
// Delete a document
// ============================================
router.delete(
  "/:document_id",
  authMiddleware,
  async (req, res) => {
    try {
      const { document_id } = req.params;

      // Verify ownership and retrieve file path
      const [documents] = await db.query(
        `SELECT d.document_id, d.file_path
         FROM documents d
         JOIN assets a ON d.asset_id = a.asset_id
         WHERE d.document_id = ? AND a.user_id = ?`,
        [document_id, req.user.user_id]
      );

      if (documents.length === 0) {
        return res.status(404).json({
          message: "Document not found",
        });
      }

      const filePath = path.resolve(documents[0].file_path);

      // Delete database record first
      await db.query(
        "DELETE FROM documents WHERE document_id = ?",
        [document_id]
      );

      // Delete file from uploads folder if it exists
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (error) => {
          if (error) {
            console.error("Failed to delete document file:", error);
          }
        });
      }

      res.json({
        message: "Document deleted successfully",
      });
    } catch (error) {
      console.error("Delete document error:", error);

      res.status(500).json({
        message: "Failed to delete document",
      });
    }
  }
);

module.exports = router;