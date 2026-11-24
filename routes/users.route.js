import express from "express";
import usersControllers from "../controllers/users.controllers.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import allowedTo from "../middlewares/allowedTo.js";
import userRoles from "../utils/userRoles.js";
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

const upload = multer({ storage: diskStorage, fileFilter: fileFilter });

const usersRouter = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (ADMIN / MANAGER)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of registered users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Insufficient role)
 */
usersRouter
  .route("/")
  .get(
    verifyToken,
    allowedTo(userRoles.ADMIN, userRoles.MANAGER),
    usersControllers.getAllUsers,
  );

/**
 * @swagger
 * /api/users/{userId}/role:
 *   patch:
 *     summary: Update user role (ADMIN only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, MANAGER, ADMIN]
 *     responses:
 *       200:
 *         description: User role updated successfully
 */
usersRouter
  .route("/:userId/role")
  .patch(
    verifyToken,
    allowedTo(userRoles.ADMIN),
    usersControllers.updateUserRole,
  );

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     summary: Delete a user (ADMIN only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
usersRouter
  .route("/:userId")
  .delete(verifyToken, allowedTo(userRoles.ADMIN), usersControllers.deleteUser);

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user with optional avatar upload
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Abdelrahman
 *               lastName:
 *                 type: string
 *                 example: Alwtany
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: StrongPass123!
 *               role:
 *                 type: string
 *                 enum: [USER, MANAGER, ADMIN]
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: User created successfully
 */
usersRouter
  .route("/register")
  .post(upload.single("avatar"), usersControllers.register);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login and receive JWT access token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: StrongPass123!
 *     responses:
 *       200:
 *         description: Login successful
 */
usersRouter.route("/login").post(usersControllers.login);

export default usersRouter;
