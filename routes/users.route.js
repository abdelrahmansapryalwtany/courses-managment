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
      Date.now() + "-" + file.originalname + "." + file.mimetype.split("/"),
    );
  },
});

const fileFilter = (req, file, cb) => {
  const imageType = file.mimetype.split("/");
  if (imageType === "image") {
    return cb(null, true);
  } else {
    return cb(appError.create("Only image files are allowed!", 400), false);
  }
};

const upload = multer({ storage: diskStorage, fileFilter: fileFilter });

const usersRouter = express.Router();

usersRouter
  .route("/")
  .get(
    verifyToken,
    allowedTo(userRoles.ADMIN, userRoles.MANAGER),
    usersControllers.getAllUsers,
  );

usersRouter
  .route("/:userId/role")
  .patch(
    verifyToken,
    allowedTo(userRoles.ADMIN),
    usersControllers.updateUserRole,
  );

usersRouter
  .route("/:userId")
  .delete(verifyToken, allowedTo(userRoles.ADMIN), usersControllers.deleteUser);

usersRouter
  .route("/register")
  .post(upload.single("avatar"), usersControllers.register);

usersRouter.route("/login").post(usersControllers.login);

export default usersRouter;
