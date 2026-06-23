import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api.js";
import { initCronJobs } from "./cron/expiry-check.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS not allowed"), false);
  },
  methods: ["GET", "POST"],
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));

// ── Request logging (lightweight) ──────────────
app.use((req, _res, next) => {
  if (req.path !== "/api/health") {
    console.log(`${req.method} ${req.path} [${new Date().toISOString()}]`);
  }
  next();
});

// ── Routes ─────────────────────────────────────
app.use("/api", apiRoutes);

// ── Root ───────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ service: "Bheemas WhatsApp Bot", status: "running" });
});

// ── Global error handler ───────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Something went wrong" });
});

// ── Graceful shutdown ──────────────────────────
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err.message);
  // Don't exit — keep the server alive on VPS
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
});

// ── Start ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Bheemas WhatsApp Bot running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);

  // Initialize cron jobs
  initCronJobs();
});
