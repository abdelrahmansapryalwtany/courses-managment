import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

import coursesRouter from "./routes/courses.route.js";
import usersRouter from "./routes/users.route.js";
import productsRouter from "./routes/products.route.js";
import ordersRouter from "./routes/orders.route.js";
import { handleShippingWebhook } from "./controllers/webhook.controllers.js";
import {
  startOrderCleanupJob,
  runOrderCleanup,
} from "./jobs/orderCleanupJob.js";
import CronLog from "./models/cronLog.model.js";
import WebhookEvent from "./models/webhook.model.js";
import { verifyToken } from "./middlewares/verifyToken.js";
import allowedTo from "./middlewares/allowedTo.js";
import userRoles from "./utils/userRoles.js";

dotenv.config();

const app = express();

// 1. Security & Core Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Rate Limiter لحماية تسجيل الدخول من التكرار المفرط
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    status: "FAIL",
    message: "Too many login attempts, please try again after 15 minutes.",
  },
});
app.use("/api/users/login", authLimiter);

// 2. Health Check Endpoint
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API server and database health status
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 */
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: Math.floor(process.uptime()),
    database:
      mongoose.connection.readyState === 1 ? "CONNECTED" : "DISCONNECTED",
    timestamp: new Date().toISOString(),
  });
});

// 3. System Observability Routes (Cron Job & Webhook Logs)
/**
 * @swagger
 * /api/system/cron-logs:
 *   get:
 *     summary: Get recent Cron Job execution logs and Webhook events (ADMIN / MANAGER)
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Execution logs fetched successfully
 */
app.get(
  "/api/system/cron-logs",
  verifyToken,
  allowedTo(userRoles.ADMIN, userRoles.MANAGER),
  async (req, res, next) => {
    try {
      const logs = await CronLog.find().sort({ createdAt: -1 }).limit(20);
      const webhookEvents = await WebhookEvent.find()
        .sort({ createdAt: -1 })
        .limit(15);
      res.json({ status: "success", data: { logs, webhookEvents } });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/system/cron-logs/run-now:
 *   post:
 *     summary: Manually trigger the expired order cleanup Cron Job (ADMIN only)
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cron job executed manually
 */
app.post(
  "/api/system/cron-logs/run-now",
  verifyToken,
  allowedTo(userRoles.ADMIN),
  async (req, res, next) => {
    try {
      const result = await runOrderCleanup("MANUAL");
      res.json({ status: "success", data: { log: result } });
    } catch (err) {
      next(err);
    }
  },
);

// 4. Swagger Interactive Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 5. External Webhooks (EasyPost Live Tracker & HMAC-Signed Carrier Webhooks)
/**
 * @swagger
 * /api/webhooks/shipping:
 *   post:
 *     summary: Receive EasyPost or HMAC-signed shipping status updates (Idempotent)
 *     tags: [Webhooks]
 *     parameters:
 *       - in: header
 *         name: x-shipping-signature
 *         required: false
 *         schema:
 *           type: string
 *         description: HMAC-SHA256 hex digest of the JSON payload
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventId:
 *                 type: string
 *                 example: evt_ship_1001
 *               orderId:
 *                 type: string
 *                 example: 665f1a2b3c4d5e6f7a8b9c0d
 *               trackingNumber:
 *                 type: string
 *                 example: EZ1000000001
 *               status:
 *                 type: string
 *                 enum: [Shipped, Delivered, Cancelled]
 *               note:
 *                 type: string
 *                 example: Package delivered by carrier
 *     responses:
 *       200:
 *         description: Webhook processed or already handled (idempotent)
 *       401:
 *         description: Invalid HMAC signature
 */
app.post("/api/webhooks/shipping", handleShippingWebhook);

// 6. Application API Routes
app.use("/api/courses", coursesRouter);
app.use("/api/users", usersRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);

// 7. 404 Not Found Handler
app.all("{*splat}", (req, res, next) => {
  return res.status(404).json({
    status: "ERROR",
    data: {
      msg: "route not found",
    },
  });
});

// 8. Global Error Handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    status: err.statusText || "ERROR",
    message: err.message || "something went wrong",
    code: err.statusCode || 500,
    data: null,
  });
});

// 9. Database Connection, Cron Job & Server Startup
if (process.env.NODE_ENV !== "test") {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("Mongo db server started");
      startOrderCleanupJob();
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err.message);
    });
}

if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`listening on port : ${port}`);
  });
}

export default app;
