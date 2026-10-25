
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db/pool.js";
import taskRoutes from "./routes/tasks.js";

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

// Welcome route
app.get("/", (req, res) => {
  res.json({
    app: "Syncora API",
    status: "running",
    message: "Welcome to Syncora!",
  });
});

// API health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// PostgreSQL health check (kept for later)
app.get("/api/health/db", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS time"
    );

    res.json({
      status: "connected",
      database: result.rows[0].database,
      time: result.rows[0].time,
    });
  } catch (error) {
    console.error(
      "Database connection failed:",
      error.message
    );

    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

// Task API
app.use("/api/tasks", taskRoutes);

export default app;
