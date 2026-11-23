import express from "express";
import Order from "../models/order.model.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import allowedTo from "../middlewares/allowedTo.js";
import userRoles from "../utils/userRoles.js";
import Stripe from "stripe";

const ordersRouter = express.Router();

// 1. إنشاء جلسة دفع عبر Stripe
ordersRouter.post("/create-checkout-session", async (req, res) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { items } = req.body;

    const line_items = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.title,
        },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/payment-success`,
      cancel_url: `${process.env.CLIENT_URL}/checkout`,
    });

    res.json({ status: "success", url: session.url });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 2. إنشاء طلب جديد (للعميل أو الزائر) + تسجيل أول خطوة في السجل
ordersRouter.post("/", async (req, res) => {
  try {
    const paymentLabel =
      req.body.customer?.paymentMethod === "STRIPE"
        ? "Paid online via Stripe"
        : "Cash on Delivery";

    const newOrder = new Order({
      ...req.body,
      statusHistory: [
        {
          status: "Pending",
          updatedBy: req.body.customer?.fullName || "Customer",
          role: req.body.user ? "USER" : "GUEST",
          note: `Order created (${paymentLabel})`,
          updatedAt: new Date(),
        },
      ],
    });

    await newOrder.save();
    res.status(201).json({ status: "success", data: { order: newOrder } });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
});

// 3. جلب طلبات المستخدم الحالي (للعميل المسجل)
ordersRouter.get("/my-orders", verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json({ status: "success", data: { orders } });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 4. جلب كل الطلبات (للأدمن والمدير فقط)
ordersRouter.get(
  "/",
  verifyToken,
  allowedTo(userRoles.ADMIN, userRoles.MANAGER),
  async (req, res) => {
    try {
      const orders = await Order.find().sort({ createdAt: -1 });
      res.json({ status: "success", data: { orders } });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  },
);

// 5. جلب تفاصيل طلب واحد بالـ ID (للأدمن/المدير أو صاحب الطلب)
ordersRouter.get("/:id", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "firstName lastName email role",
    );

    if (!order) {
      return res
        .status(404)
        .json({ status: "fail", message: "Order not found" });
    }

    const isStaff =
      req.user.role === userRoles.ADMIN || req.user.role === userRoles.MANAGER;
    const isOwner = order.user && order.user._id.toString() === req.user.id;

    if (!isStaff && !isOwner) {
      return res
        .status(403)
        .json({ status: "fail", message: "Not authorized to view this order" });
    }

    res.json({ status: "success", data: { order } });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
});

// 6. تحديث حالة الطلب + تسجيل من قام بالتغيير في statusHistory
ordersRouter.patch(
  "/:id/status",
  verifyToken,
  allowedTo(userRoles.ADMIN, userRoles.MANAGER),
  async (req, res) => {
    try {
      const { status, note } = req.body;
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res
          .status(404)
          .json({ status: "fail", message: "Order not found" });
      }

      order.status = status;
      order.statusHistory.push({
        status,
        updatedBy: req.user.email,
        role: req.user.role,
        note: note || `Status changed to ${status}`,
        updatedAt: new Date(),
      });

      await order.save();
      res.json({ status: "success", data: { order } });
    } catch (err) {
      res.status(400).json({ status: "fail", message: err.message });
    }
  },
);

export default ordersRouter;
