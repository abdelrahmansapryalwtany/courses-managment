import express from "express";
import productsControllers from "../controllers/products.controllers.js";
import { validationSchema } from "../middlewares/validationSchema.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import userRoles from "../utils/userRoles.js";
import allowedTo from "../middlewares/allowedTo.js";
import multer from "multer";
import appError from "../utils/appError.js";

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() + "-" + file.originalname + "." + file.mimetype.split("/")[1],
    );
  },
});

const fileFilter = (req, file, cb) => {
  const imageType = file.mimetype.split("/")[0];

  if (imageType === "image") {
    return cb(null, true);
  } else {
    return cb(appError.create("Only image files are allowed!", 400), false);
  }
};

const upload = multer({
  storage: diskStorage,
  fileFilter: fileFilter,
});

const productsRouter = express.Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with pagination, search, and filtering
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of products
 *   post:
 *     summary: Add a new product (ADMIN / MANAGER)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, price, category]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Wireless Mechanical Keyboard
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *                 example: 89.99
 *               category:
 *                 type: string
 *                 example: Electronics
 *               stock:
 *                 type: integer
 *                 example: 25
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 */
productsRouter
  .route("/")
  .get(productsControllers.getAllProducts)
  .post(
    verifyToken,
    allowedTo(userRoles.ADMIN, userRoles.MANAGER),
    upload.single("image"),
    validationSchema(),
    productsControllers.addProduct,
  );

/**
 * @swagger
 * /api/products/categories:
 *   get:
 *     summary: Get all available product categories
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of product categories
 */
productsRouter.route("/categories").get(productsControllers.getCategories);

/**
 * @swagger
 * /api/products/category/{category}:
 *   get:
 *     summary: Get products filtered by category
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           example: Electronics
 *     responses:
 *       200:
 *         description: Products matching the category
 */
productsRouter
  .route("/category/:category")
  .get(productsControllers.getCategoryProducts);

/**
 * @swagger
 * /api/products/{productId}:
 *   get:
 *     summary: Get single product details by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 *   patch:
 *     summary: Update an existing product (ADMIN / MANAGER)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Product updated successfully
 *   delete:
 *     summary: Delete a product (ADMIN / MANAGER)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted successfully
 */
productsRouter
  .route("/:productId")
  .get(productsControllers.getProduct)
  .patch(
    verifyToken,
    allowedTo(userRoles.ADMIN, userRoles.MANAGER),
    upload.single("image"),
    productsControllers.updateProduct,
  )
  .delete(
    verifyToken,
    allowedTo(userRoles.ADMIN, userRoles.MANAGER),
    productsControllers.deleteProduct,
  );

export default productsRouter;
