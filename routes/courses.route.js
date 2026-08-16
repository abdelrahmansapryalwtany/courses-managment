
import express from 'express';
import coursesControllers from "../controllers/courses.controllers.js";
import {validationSchema} from "../middlewares/validationSchema.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import userRoles from "../utils/userRoles.js";
import allowedTo from "../middlewares/allowedTo.js";

const coursesRouter = express.Router();

coursesRouter.route('/')
    .get(coursesControllers.getAllCourses)
    .post(verifyToken ,validationSchema(), coursesControllers.addCourse)

coursesRouter.route('/:courseId')
    .get(coursesControllers.getCourse)
    .patch(coursesControllers.updateCourse)
    .delete(verifyToken, allowedTo(userRoles.ADMIN, userRoles.MANAGER), coursesControllers.deleteCourse)

export default coursesRouter;