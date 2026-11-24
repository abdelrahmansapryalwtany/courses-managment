import express from "express";
import Order from "../models/order.model.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import allowedTo from "../middlewares/allowedTo.js";
import userRoles from "../utils/userRoles.js";
import Stripe from "stripe";
import { createEasyPostShipment } from "../services/easypostService.js";
import { sendWebhookAlert } from "../services/webhookAlertService.js";

const ordersRouter = express.Router();

/**
 * @swagger
 * /api/orders/create-checkout-session:
 *   post:
 *     summary: Create a Stripe Checkout payment session
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                       example: Mechanical Keyboard
 *                     price:
 *                       type: number
 *                       example: 89.99
 *                     quantity:
 *                       type: integer
 *                       example: 1
 *     responses:
 *       200:
 *         description: Stripe Checkout session URL generated
 */
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

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order (Guest or Authenticated User) with initial audit log
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               customer:
 *                 type: object
 *                 properties:
 *                   fullName:
 *                     type: string
 *                     example: Abdelrahman Alwtany
 *                   paymentMethod:
 *                     type: string
 *                     enum: [STRIPE, COD]
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               totalPrice:
 *                 type: number
 *                 example: 150
 *     responses:
 *       201:
 *         description: Order created successfully
 *   get:
 *     summary: Get all orders (ADMIN / MANAGER)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all orders
 */
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

/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Get orders belonging to the authenticated user
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user's orders
 */
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

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get single order details by ID (Owner, ADMIN, or MANAGER)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *       403:
 *         description: Not authorized to view this order
 *       404:
 *         description: Order not found
 */
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

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status and record audit log entry (ADMIN / MANAGER)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 example: Shipped
 *               note:
 *                 type: string
 *                 example: Handed over to courier
 *     responses:
 *       200:
 *         description: Order status updated
 */
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

/**
 * @swagger
 * /api/orders/{id}/ship:
 *   post:
 *     summary: Generate shipping label & tracking number via EasyPost Sandbox (ADMIN / MANAGER)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shipment created and tracking number generated
 */
ordersRouter.post(
  "/:id/ship",
  verifyToken,
  allowedTo(userRoles.ADMIN, userRoles.MANAGER),
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res
          .status(404)
          .json({ status: "fail", message: "Order not found" });
      }

      const shipment = await createEasyPostShipment(order);

      order.status = "Shipped";
      order.trackingNumber = shipment.trackingNumber;
      order.statusHistory.push({
        status: "Shipped",
        updatedBy: req.user.email,
        role: req.user.role,
        note: `Shipped via ${shipment.carrier} (${shipment.service}) - Tracking: ${shipment.trackingNumber}`,
        updatedAt: new Date(),
      });

      await order.save();

      await sendWebhookAlert({
        title: "📦 EasyPost Shipping Label Generated",
        message: `Order #${order._id} dispatched via ${shipment.carrier}.`,
        color: 3447003,
        fields: [
          { label: "Tracking #", value: shipment.trackingNumber },
          {
            label: "Carrier",
            value: `${shipment.carrier} (${shipment.service})`,
          },
          { label: "Label PDF", value: shipment.labelUrl || "Generated" },
        ],
      });

      res.json({ status: "success", data: { order, shipment } });
    } catch (err) {
      res.status(400).json({ status: "fail", message: err.message });
    }
  },
);

export default ordersRouter;
