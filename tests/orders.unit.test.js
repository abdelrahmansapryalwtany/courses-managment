import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert";
import jwt from "jsonwebtoken";
import request from "supertest";

let capturedSessionPayload = null;

mock.module("stripe", {
  exports: {
    default: class MockStripe {
      constructor() {
        this.checkout = {
          sessions: {
            create: async (payload) => {
              capturedSessionPayload = payload;
              return { url: "https://stripe.com" };
            },
          },
        };
      }
    },
  },
});

const { default: app } = await import("../index.js");
const { default: Order } = await import("../models/order.model.js");

describe("Orders Authorization (IDOR) & Stripe Checkout Unit Tests", () => {
  const secret = process.env.JWT_SECRET || "test_jwt_secret";

  afterEach(() => {
    mock.restoreAll();
    capturedSessionPayload = null;
  });

  it("1. Should prevent IDOR: forbid User A from viewing User B's order (403)", async () => {
    const userAToken = jwt.sign(
      { id: "user_a_id_111", email: "usera@test.com", role: "USER" },
      secret,
      { expiresIn: "1h" },
    );

    const fakeOrderOwnedByUserB = {
      _id: "order_999",
      user: {
        _id: { toString: () => "user_b_id_222" },
        email: "userb@test.com",
      },
      totalPrice: 300,
    };

    mock.method(Order, "findById", () => ({
      populate: async () => fakeOrderOwnedByUserB,
    }));

    const res = await request(app)
      .get("/api/orders/order_999")
      .set("Authorization", `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 403);
    assert.match(res.body.message, /not authorized/i);
  });

  it("2. Should allow order owner to view their own order (200)", async () => {
    const userAToken = jwt.sign(
      { id: "user_a_id_111", email: "usera@test.com", role: "USER" },
      secret,
      { expiresIn: "1h" },
    );

    const fakeOwnOrder = {
      _id: "order_111",
      user: {
        _id: { toString: () => "user_a_id_111" },
        email: "usera@test.com",
      },
      totalPrice: 150,
    };

    mock.method(Order, "findById", () => ({
      populate: async () => fakeOwnOrder,
    }));

    const res = await request(app)
      .get("/api/orders/order_111")
      .set("Authorization", `Bearer ${userAToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.order._id, "order_111");
  });

  it("3. Should allow ADMIN/MANAGER to view any user's order (200)", async () => {
    const adminToken = jwt.sign(
      { id: "admin_id_001", email: "admin@test.com", role: "ADMIN" },
      secret,
      { expiresIn: "1h" },
    );

    const fakeUserOrder = {
      _id: "order_999",
      user: { _id: { toString: () => "user_b_id_222" } },
      totalPrice: 300,
    };

    mock.method(Order, "findById", () => ({
      populate: async () => fakeUserOrder,
    }));

    const res = await request(app)
      .get("/api/orders/order_999")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
  });

  it("4. Should accurately convert floating-point prices (e.g., 19.99) to integer cents for Stripe", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_mock_key";
    process.env.CLIENT_URL = "http://localhost:3000";

    const res = await request(app)
      .post("/api/orders/create-checkout-session")
      .send({
        items: [
          { title: "Node.js Pro Course", price: 19.99, quantity: 2 },
          { title: "Docker Guide", price: 9.95, quantity: 1 },
        ],
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.url, "https://stripe.com");
    assert.strictEqual(
      capturedSessionPayload.line_items[0].price_data.unit_amount,
      1999,
    );
    assert.strictEqual(
      capturedSessionPayload.line_items[1].price_data.unit_amount,
      995,
    );
  });

  it("5. Should create a new order and initialize statusHistory audit log (201)", async () => {
    // تزييف دالة الحفظ على Order.prototype.save
    const saveSpy = mock.method(Order.prototype, "save", async function () {
      return this;
    });

    const res = await request(app)
      .post("/api/orders")
      .send({
        customer: {
          fullName: "Abdelrahman Alwtany",
          paymentMethod: "STRIPE",
        },
        items: [{ title: "Node.js Pro Course", price: 19.99, quantity: 1 }],
        totalPrice: 19.99,
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(saveSpy.mock.calls.length, 1);
    assert.strictEqual(res.body.data.order.statusHistory.length, 1);
    assert.strictEqual(res.body.data.order.statusHistory[0].status, "Pending");
    assert.match(res.body.data.order.statusHistory[0].note, /Stripe/i);
  });
});
