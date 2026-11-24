import cron from "node-cron";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js"; // تأكد من اسم الملف لديك
import { sendWebhookAlert } from "../services/webhookAlertService.js";

export const runOrderCleanup = async () => {
  console.log("[CRON] Running daily 6:00 AM expired pending orders cleanup...");
  try {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const expiredOrders = await Order.find({
      status: "Pending",
      createdAt: { $lt: cutoffDate },
    });

    if (expiredOrders.length === 0) return;

    for (const order of expiredOrders) {
      order.status = "Cancelled";
      if (Array.isArray(order.statusHistory)) {
        order.statusHistory.push({
          status: "Cancelled",
          note: "Auto-cancelled by daily cron job (unpaid > 24h)",
          updatedAt: new Date(),
        });
      }
      await order.save();

      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity },
          });
        }
      }
    }

    await sendWebhookAlert({
      title: "⏰ Daily Cron Job: Expired Orders Cancelled",
      message: `Automatically cancelled ${expiredOrders.length} unpaid order(s) and restored inventory.`,
      color: 14431557,
      fields: [
        { label: "Cancelled Count", value: expiredOrders.length },
        { label: "Schedule", value: "Daily at 6:00 AM (Cairo)" },
      ],
    });
  } catch (err) {
    console.error("[CRON] Cleanup job error:", err);
  }
};

export const startOrderCleanupJob = () => {
  cron.schedule("0 6 * * *", runOrderCleanup, {
    timezone: "Africa/Cairo",
  });
};
