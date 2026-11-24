import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    provider: { type: String, default: "shipping_partner" },
    eventType: { type: String, required: true },
    payload: { type: Object },
  },
  { timestamps: true },
);

const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);
export default WebhookEvent;
