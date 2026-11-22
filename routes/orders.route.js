import express from "express";
const ordersRouter = express.Router();
import Order from "../models/order.model.js";

// إنشاء طلب جديد (للعميل)
ordersRouter.post("/", async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(201).json({ status: "success", data: { order: newOrder } });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
});

// جلب كل الطلبات (للأدمن)
ordersRouter.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ status: "success", data: { orders } });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// تحديث حالة الطلب (للأدمن)
ordersRouter.patch("/:id/status", async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true },
    );
    res.json({ status: "success", data: { order } });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
});

export default ordersRouter;
