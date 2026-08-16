// import { courses } from "../data/courses.js"
import { validationResult } from "express-validator";
import { SUCCESS, ERROR, FAIL } from "../utils/httpStatusTest.js";
import  User  from "../models/user.model.js";
import appError from "../utils/appError.js";
import { asyncWrapper } from "../middlewares/asyncWrapper.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateJWT } from "../utils/generateJWT.js";

const getAllUsers = asyncWrapper(
    async (req, res) => {

        const limit = +req.query.limit || 10;
        const page = +req.query.page || 1;
        const offset = (page - 1) * limit;

        const users = await User.find({}, { "__v": false, "password": false }).limit(limit).skip(offset);
        res.json({ status: SUCCESS, data: { users } });
    })

const login = asyncWrapper(
    async (req, res, next) => {
        const { email, password } = req.body;
        if (!email || !password) {
            const error = appError.create('Email and password are required', 400, FAIL);
            return next(error);
        }
        const user = await User.findOne({ email });
        if (!user) {
            const error = appError.create('Invalid email or password', 400, FAIL);
            return next(error);
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const error = appError.create('Invalid email or password', 400, FAIL);
            return next(error);
        }
        const token = await generateJWT({ id: user._id, email: user.email, role: user.role });
        return res.json({ status: SUCCESS, data: { token } })
    })

const register = asyncWrapper(
    async (req, res, next) => {

        const {firstName, lastName, email, password, role} = req.body;
        const oldUser = await User.findOne({ email });
        if (oldUser) {
            const error = appError.create('User already exists', 400, FAIL);
            return next(error);
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({firstName, lastName, email, password: hashedPassword, role, avatar: req.file ? req.file.filename : undefined});
        const token = await generateJWT({ id: newUser._id, email: newUser.email, role: newUser.role });
        newUser.token = token;
        await newUser.save();

        return res.status(201).json({ status: SUCCESS, data: { user: newUser } });
       
    })


export default {
    getAllUsers,
    login,
    register,
}