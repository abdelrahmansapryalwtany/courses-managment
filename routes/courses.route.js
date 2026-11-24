import express from "express";
import coursesControllers from "../controllers/courses.controllers.js";
import { validationSchema } from "../middlewares/validationSchema.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import userRoles from "../utils/userRoles.js";
import allowedTo from "../middlewares/allowedTo.js";

const coursesRouter = express.Router();

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all courses
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: List of courses
 *   post:
 *     summary: Add a new course (Authenticated users)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, price]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Node.js Microservices Architecture
 *               price:
 *                 type: number
 *                 example: 120
 *     responses:
 *       201:
 *         description: Course created successfully
 */
coursesRouter
  .route("/")
  .get(coursesControllers.getAllCourses)
  .post(verifyToken, validationSchema(), coursesControllers.addCourse);

/**
 * @swagger
 * /api/courses/{courseId}:
 *   get:
 *     summary: Get single course by ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course details
 *   patch:
 *     summary: Update course details
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Course updated
 *   delete:
 *     summary: Delete a course (ADMIN / MANAGER)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course deleted
 */
coursesRouter
  .route("/:courseId")
  .get(coursesControllers.getCourse)
  .patch(coursesControllers.updateCourse)
  .delete(
    verifyToken,
    allowedTo(userRoles.ADMIN, userRoles.MANAGER),
    coursesControllers.deleteCourse,
  );

export default coursesRouter;
