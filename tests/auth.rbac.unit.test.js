import { describe, it } from "node:test";
import assert from "node:assert";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../index.js";

describe("Authentication & RBAC Authorization Unit Tests", () => {
  const secret = process.env.JWT_SECRET || "test_jwt_secret";

  it("1. Should reject protected route without Authorization header (401)", async () => {
    const res = await request(app).get("/api/users");
    assert.strictEqual(res.status, 401);
  });

  it("2. Should reject tampered/invalid JWT token (401)", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", "Bearer invalid.jwt.token");
    assert.strictEqual(res.status, 401);
  });

  it("3. Should forbid regular USER from accessing ADMIN-only endpoints (403)", async () => {
    const userToken = jwt.sign(
      { id: "665f1a2b3c4d5e6f7a8b9c01", email: "user@test.com", role: "USER" },
      secret,
      { expiresIn: "1h" },
    );

    const res = await request(app)
      .delete("/api/users/665f1a2b3c4d5e6f7a8b9c02")
      .set("Authorization", `Bearer ${userToken}`);

    assert.strictEqual(res.status, 403);
  });
});
