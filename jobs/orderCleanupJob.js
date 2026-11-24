import cron from "node-cron";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import CronLog from "../models/cronLog.model.js";
import { sendWebhookAlert } from "../services/webhookAlertService.js";

export const runOrderCleanup = async (triggerType = "SCHEDULED") => {
  const startTime = Date.now();
  try {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const expiredOrders = await Order.find({
      status: "Pending",
      createdAt: { $lt: cutoffDate },
    });

    let restoredItemsCount = 0;

    for (const order of expiredOrders) {
      order.status = "Cancelled";
      if (Array.isArray(order.statusHistory)) {
        order.statusHistory.push({
          status: "Cancelled",
          updatedBy:
            triggerType === "MANUAL"
              ? "Admin Manual Trigger"
              : "System Cron Job",
          role: "SYSTEM",
          note: "Auto-cancelled (unpaid > 24h) & stock restored",
          updatedAt: new Date(),
        });
      }
      await order.save();

      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          restoredItemsCount += Number(item.quantity || 0);
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity },
          });
        }
      }
    }

    const logEntry = await CronLog.create({
      jobName: "DAILY_ORDER_CLEANUP",
      triggerType,
      status: "SUCCESS",
      cancelledOrdersCount: expiredOrders.length,
      restoredItemsCount,
      details:
        expiredOrders.length > 0
          ? `Cancelled ${expiredOrders.length} expired order(s) and restored ${restoredItemsCount} unit(s).`
          : "Checked database: 0 expired pending orders found.",
      durationMs: Date.now() - startTime,
    });

    if (expiredOrders.length > 0) {
      await sendWebhookAlert({
        title: "⏰ Cron Job: Expired Orders Cancelled",
        message: logEntry.details,
        color: 14431557,
        fields: [
          { label: "Cancelled Orders", value: expiredOrders.length },
          { label: "Restored Units", value: restoredItemsCount },
          { label: "Trigger", value: triggerType },
        ],
      });
    }

    return logEntry;
  } catch (err) {
    await CronLog.create({
      jobName: "DAILY_ORDER_CLEANUP",
      triggerType,
      status: "FAILED",
      details: err.message,
      durationMs: Date.now() - startTime,
    });
    throw err;
  }
};

export const startOrderCleanupJob = () => {
  cron.schedule("0 6 * * *", () => runOrderCleanup("SCHEDULED"), {
    timezone: "Africa/Cairo",
  });
};
