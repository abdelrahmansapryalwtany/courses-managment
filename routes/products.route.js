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

productsRouter.route("/categories").get(productsControllers.getCategories);

productsRouter
  .route("/category/:category")
  .get(productsControllers.getCategoryProducts);

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
