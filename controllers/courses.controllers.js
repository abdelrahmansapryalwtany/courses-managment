// import { courses } from "../data/courses.js"
import { validationResult } from "express-validator";

import { SUCCESS, ERROR, FAIL } from "../utils/httpStatusTest.js";

import Course from "../models/course.model.js";

import appError from "../utils/appError.js";

import { asyncWrapper } from "../middlewares/asyncWrapper.js";

const getAllCourses = asyncWrapper(
    async (req, res) => {

        const limit = +req.query.limit || 10;
        const page = +req.query.page || 1;
        const offset = (page - 1) * limit;

        const courses = await Course.find({}, { "__v": false }).limit(limit).skip(offset);
        res.json({ status: SUCCESS, data: { courses } });
    })

const getCourse = asyncWrapper(
    async (req, res, next) => {

        const course = await Course.findById(req.params.courseId);
        if (!course) {
            const error = appError.create('Course not found', 404, FAIL);
            return next(error);
        }
        return res.json({ status: SUCCESS, data: { course } })
    })

const addCourse = asyncWrapper(
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = appError.create(errors.array(), 400, FAIL);
            return next(error);
        }
        const newCourse = new Course(req.body);
        await newCourse.save();

        return res.status(201).json({ status: SUCCESS, data: { course: newCourse } });
    })

const updateCourse = asyncWrapper(
    async (req, res, next) => {
        const courseId = req.params.courseId;
        const updatedCourse = await Course.findByIdAndUpdate(courseId, { $set: { ...req.body } }, { returnDocument: "after" });
        return res.status(200).json({ status: SUCCESS, data: { course: updatedCourse } })
})

const deleteCourse = asyncWrapper(
    async (req, res, next) => {
        await Course.findByIdAndDelete(req.params.courseId);
        return res.status(200).json({ status: SUCCESS, data: null })
    }
)

export default {
    getAllCourses,
    getCourse,
    addCourse,
    updateCourse,
    deleteCourse
}