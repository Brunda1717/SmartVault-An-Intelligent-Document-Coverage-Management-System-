const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./db");
const authRoutes = require("./routes/auth");
const assetRoutes = require("./routes/assetRoutes");
const coverageRoutes = require("./routes/coverageRoutes");
const documentRoutes = require("./routes/documentRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/coverage", coverageRoutes);
app.use("/api/documents", documentRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "SmartVault backend is running"
    });
});

// Test database connection
app.get("/api/test-db", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT 1 AS result");

        res.json({
            message: "Database connected successfully",
            data: rows
        });
    } catch (error) {
        console.error("DATABASE ERROR:", error);

res.status(500).json({
    message: "Database connection failed",
    error: error.message
});
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`SmartVault backend running on port ${PORT}`);
});