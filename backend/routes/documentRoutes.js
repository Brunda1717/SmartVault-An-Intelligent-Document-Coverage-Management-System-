const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" + file.originalname;

        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png"
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Invalid file type. Only PDF, JPG, JPEG and PNG files are allowed."
            ),
            false
        );
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// Upload document
router.post(
    "/",
    authMiddleware,
    (req, res, next) => {
        upload.single("document")(req, res, (error) => {
            if (error instanceof multer.MulterError) {
                if (error.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({
                        message: "File size must be 5 MB or less"
                    });
                }

                return res.status(400).json({
                    message: error.message
                });
            }

            if (error) {
                return res.status(400).json({
                    message: error.message
                });
            }

            next();
        });
    },
    async (req, res) => {
        try {
            const {
                asset_id,
                coverage_id,
                document_type
            } = req.body;

            if (!asset_id) {
                return res.status(400).json({
                    message: "Asset ID is required"
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    message: "Document file is required"
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

            // If coverage_id is provided, verify that
            // the coverage belongs to the same asset
            if (coverage_id) {
                const [coverage] = await db.query(
                    `SELECT coverage_id
                     FROM coverage
                     WHERE coverage_id = ?
                     AND asset_id = ?`,
                    [coverage_id, asset_id]
                );

                if (coverage.length === 0) {
                    return res.status(400).json({
                        message: "Coverage does not belong to the selected asset"
                    });
                }
            }

            const [result] = await db.query(
                `INSERT INTO documents
                (
                    asset_id,
                    coverage_id,
                    document_type,
                    file_name,
                    file_path,
                    file_size
                )
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    asset_id,
                    coverage_id || null,
                    document_type || null,
                    req.file.originalname,
                    req.file.path,
                    req.file.size
                ]
            );

            res.status(201).json({
                message: "Document uploaded successfully",
                document_id: result.insertId
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Failed to upload document"
            });
        }
    }
);

// Get documents for an asset
router.get(
    "/asset/:asset_id",
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

            const [documents] = await db.query(
                `SELECT
                    document_id,
                    asset_id,
                    coverage_id,
                    document_type,
                    file_name,
                    file_size,
                    uploaded_at
                 FROM documents
                 WHERE asset_id = ?
                 ORDER BY uploaded_at DESC`,
                [asset_id]
            );

            res.json(documents);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Failed to fetch documents"
            });
        }
    }
);

// View document
router.get(
    "/:document_id/view",
    authMiddleware,
    async (req, res) => {
        try {
            const { document_id } = req.params;

            const [documents] = await db.query(
                `SELECT d.file_path
                 FROM documents d
                 JOIN assets a
                 ON d.asset_id = a.asset_id
                 WHERE d.document_id = ?
                 AND a.user_id = ?`,
                [document_id, req.user.user_id]
            );

            if (documents.length === 0) {
                return res.status(404).json({
                    message: "Document not found"
                });
            }

            res.sendFile(
                path.resolve(documents[0].file_path)
            );

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Failed to view document"
            });
        }
    }
);

module.exports = router;