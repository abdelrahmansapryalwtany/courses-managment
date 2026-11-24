import crypto from "crypto";
import Order from "../models/order.model.js";
import WebhookEvent from "../models/webhook.model.js";
import { sendWebhookAlert } from "../services/webhookAlertService.js";

export const handleShippingWebhook = async (req, res) => {
  try {
    // =========================================================================
    // المسار 1: استقبال أحداث EasyPost Webhooks الحية (مثل tracker.updated)
    // =========================================================================
    if (req.body?.object === "Event") {
      if (req.body.description !== "tracker.updated") {
        return res.status(200).json({
          received: true,
          message: `Ignored EasyPost event: ${req.body.description}`,
        });
      }

      const tracker = req.body.result;
      const eventId = req.body.id;
      const trackingNumber = tracker?.tracking_code;
      const epStatus = tracker?.status || "in_transit";

      if (!eventId || !trackingNumber) {
        return res
          .status(400)
          .json({ message: "Invalid EasyPost tracker payload" });
      }

      // Idempotency Check: منع معالجة نفس الحدث مرتين
      const alreadyProcessed = await WebhookEvent.findOne({ eventId });
      if (alreadyProcessed) {
        return res.status(200).json({
          message: "EasyPost event already processed (idempotent)",
        });
      }

      const order = await Order.findOne({ trackingNumber });
      if (!order) {
        return res.status(200).json({
          message: `No local order matched tracking code: ${trackingNumber}`,
        });
      }

      const mappedStatus = epStatus === "delivered" ? "Delivered" : "Shipped";
      order.status = mappedStatus;

      if (Array.isArray(order.statusHistory)) {
        order.statusHistory.push({
          status: mappedStatus,
          updatedBy: "EasyPost Webhook",
          role: "SYSTEM",
          note: `EasyPost live tracking update: ${epStatus} (${trackingNumber})`,
          updatedAt: new Date(),
        });
      }

      await order.save();

      await WebhookEvent.create({
        eventId,
        provider: "easypost",
        eventType: epStatus,
        payload: req.body,
      });

      await sendWebhookAlert({
        title: `🚚 EasyPost Live Update: ${epStatus.toUpperCase()}`,
        message: `Order #${order._id} updated automatically via EasyPost Webhook.`,
        color: mappedStatus === "Delivered" ? 15844367 : 3447003,
        fields: [
          { label: "Order ID", value: order._id },
          { label: "Tracking #", value: trackingNumber },
          { label: "New Status", value: mappedStatus },
        ],
      });

      return res.status(200).json({
        success: true,
        provider: "easypost",
        orderStatus: mappedStatus,
      });
    }

    // =========================================================================
    // المسار 2: استقبال Webhook الموقّع بـ HMAC-SHA256 (للمحاكاة والاختبارات)
    // =========================================================================
    const signature = req.headers["x-shipping-signature"];
    const secret = process.env.SHIPPING_WEBHOOK_SECRET;

    if (!secret) {
      return res
        .status(500)
        .json({ message: "Webhook secret is not configured" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (!signature || signature !== expectedSignature) {
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const { eventId, orderId, trackingNumber, status, note } = req.body;
    if (!eventId || !orderId || !status) {
      return res
        .status(400)
        .json({ message: "Missing required fields: eventId, orderId, status" });
    }

    // Idempotency Check
    const alreadyProcessed = await WebhookEvent.findOne({ eventId });
    if (alreadyProcessed) {
      return res
        .status(200)
        .json({ message: "Event already processed (idempotent)" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (Array.isArray(order.statusHistory)) {
      order.statusHistory.push({
        status,
        updatedBy: "Shipping Webhook",
        role: "SYSTEM",
        note:
          note || `Updated via Shipping Webhook (${trackingNumber || "N/A"})`,
        updatedAt: new Date(),
      });
    }
    await order.save();

    await WebhookEvent.create({
      eventId,
      provider: "shipping_partner",
      eventType: status,
      payload: req.body,
    });

    await sendWebhookAlert({
      title: `🚚 Shipping Update: ${status}`,
      message: `Order #${order._id} status updated via carrier webhook.`,
      color: status === "Delivered" ? 15844367 : 3447003,
      fields: [
        { label: "Order ID", value: order._id },
        { label: "New Status", value: status },
        { label: "Tracking #", value: trackingNumber || "N/A" },
      ],
    });

    return res.status(200).json({ success: true, orderStatus: order.status });
  } catch (error) {
    console.error("Shipping webhook error:", error);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
};
