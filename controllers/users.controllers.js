import { SUCCESS, FAIL } from "../utils/httpStatusTest.js";
import User from "../models/user.model.js";
import appError from "../utils/appError.js";
import { asyncWrapper } from "../middlewares/asyncWrapper.js";
import bcrypt from "bcryptjs";
import { generateJWT } from "../utils/generateJWT.js";

const getAllUsers = asyncWrapper(async (req, res) => {
  const limit = +req.query.limit || 10;
  const page = +req.query.page || 1;
  const offset = (page - 1) * limit;

  const users = await User.find({}, { __v: false, password: false })
    .limit(limit)
    .skip(offset);
  res.json({ status: SUCCESS, data: { users } });
});

const login = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    const error = appError.create("Email and password are required", 400, FAIL);
    return next(error);
  }
  const user = await User.findOne({ email });
  if (!user) {
    const error = appError.create("Invalid email or password", 400, FAIL);
    return next(error);
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = appError.create("Invalid email or password", 400, FAIL);
    return next(error);
  }
  const token = await generateJWT({
    id: user._id,
    email: user.email,
    role: user.role,
  });
  return res.json({ status: SUCCESS, data: { token } });
});

const register = asyncWrapper(async (req, res, next) => {
  const { firstName, lastName, email, password, role } = req.body;
  const oldUser = await User.findOne({ email });
  if (oldUser) {
    const error = appError.create("User already exists", 400, FAIL);
    return next(error);
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role,
    avatar: req.file ? req.file.filename : undefined,
  });
  const token = await generateJWT({
    id: newUser._id,
    email: newUser.email,
    role: newUser.role,
  });
  newUser.token = token;
  await newUser.save();

  return res.status(201).json({ status: SUCCESS, data: { user: newUser } });
});

const PROTECTED_ADMIN_EMAIL = "admin@gmail.com";
const PROTECTED_MANAGER_EMAIL = "manager@gmail.com";

const updateUserRole = asyncWrapper(async (req, res, next) => {
  const targetUser = await User.findById(req.params.userId);
  if (!targetUser) {
    return next(appError.create("User not found", 404, FAIL));
  }

  if (
    targetUser.email === PROTECTED_ADMIN_EMAIL ||
    targetUser.email === PROTECTED_MANAGER_EMAIL
  ) {
    return next(
      appError.create(
        "Demo Super Admin or Manager role cannot be modified",
        403,
        FAIL,
      ),
    );
  }

  targetUser.role = req.body.role;
  await targetUser.save();
  res.json({ status: SUCCESS, data: { user: targetUser } });
});

const deleteUser = asyncWrapper(async (req, res, next) => {
  const targetUser = await User.findById(req.params.userId);
  if (!targetUser) {
    return next(appError.create("User not found", 404, FAIL));
  }

  if (
    targetUser.email === PROTECTED_ADMIN_EMAIL ||
    targetUser.email === PROTECTED_MANAGER_EMAIL
  ) {
    return next(
      appError.create(
        "Demo Super Admin or Manager account cannot be deleted",
        403,
        FAIL,
      ),
    );
  }

  await User.findByIdAndDelete(req.params.userId);
  res.json({ status: SUCCESS, data: null });
});

export default {
  getAllUsers,
  login,
  register,
  updateUserRole,
  deleteUser,
};
