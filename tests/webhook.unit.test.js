import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";
import crypto from "crypto";
import request from "supertest";
import app from "../index.js";
import Order from "../models/order.model.js";
import WebhookEvent from "../models/webhook.model.js";

const WEBHOOK_SECRET = "unit_test_secret_2026";

const signPayload = (payload) =>
  crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");

describe("Shipping Webhook Unit Tests (No Database / Mocked Models)", () => {
  beforeEach(() => {
    process.env.SHIPPING_WEBHOOK_SECRET = WEBHOOK_SECRET;
    delete process.env.DISCORD_WEBHOOK_URL;
  });

  afterEach(() => {
    mock.restoreAll(); // إعادة كل الدوال المزيفة لوضعها الطبيعي بعد كل اختبار
  });

  it("1. Should reject request with missing or invalid HMAC signature (401)", async () => {
    const payload = {
      eventId: "evt_unauth_1",
      orderId: "665f1a2b3c4d5e6f7a8b9c0d",
      status: "SHIPPED",
    };

    const res = await request(app)
      .post("/api/webhooks/shipping")
      .set("x-shipping-signature", "invalid_signature_hex")
      .send(payload);

    assert.strictEqual(res.status, 401);
  });

  it("2. Should return 400 when required fields are missing even with valid signature", async () => {
    const payload = { eventId: "evt_incomplete_1" }; // ناقص orderId و status

    const res = await request(app)
      .post("/api/webhooks/shipping")
      .set("x-shipping-signature", signPayload(payload))
      .send(payload);

    assert.strictEqual(res.status, 400);
  });

  it("3. Should skip processing and return 200 if eventId was already processed (Idempotency)", async () => {
    // محاكاة أن الحدث موجود بالفعل في قاعدة البيانات
    mock.method(WebhookEvent, "findOne", async () => ({
      eventId: "evt_duplicate_99",
      eventType: "SHIPPED",
    }));

    // نتأكد أن Order.findById لن يتم استدعاؤها أصلاً
    const findOrderSpy = mock.method(Order, "findById", async () => null);

    const payload = {
      eventId: "evt_duplicate_99",
      orderId: "665f1a2b3c4d5e6f7a8b9c0d",
      status: "DELIVERED",
    };

    const res = await request(app)
      .post("/api/webhooks/shipping")
      .set("x-shipping-signature", signPayload(payload))
      .send(payload);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(findOrderSpy.mock.calls.length, 0); // لم يلمس الطلب
  });

  it("4. Should update order status and record webhook event on valid new event (200)", async () => {
    // محاكاة عدم وجود الحدث مسبقاً
    mock.method(WebhookEvent, "findOne", async () => null);
    const createEventSpy = mock.method(
      WebhookEvent,
      "create",
      async (doc) => doc,
    );

    // كائن طلب وهمي في الذاكرة مع دالة save() وهمية
    const fakeOrder = {
      _id: "665f1a2b3c4d5e6f7a8b9c0d",
      status: "Pending",
      trackingNumber: null,
      statusHistory: [],
      save: mock.fn(async function () {
        return this;
      }),
    };

    mock.method(Order, "findById", async () => fakeOrder);

    const payload = {
      eventId: "evt_new_500",
      orderId: "665f1a2b3c4d5e6f7a8b9c0d",
      trackingNumber: "EG-TRK-778899",
      status: "Shipped",
      note: "Out for delivery",
    };

    const res = await request(app)
      .post("/api/webhooks/shipping")
      .set("x-shipping-signature", signPayload(payload))
      .send(payload);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(fakeOrder.status, "Shipped");
    assert.strictEqual(fakeOrder.trackingNumber, "EG-TRK-778899");
    assert.strictEqual(fakeOrder.save.mock.calls.length, 1);
    assert.strictEqual(createEventSpy.mock.calls.length, 1);
  });
});
