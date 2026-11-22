import express from "express";

import mongoose from "mongoose";

import dotenv from "dotenv";

import { FAIL } from "./utils/httpStatusTest.js";

import cors from "cors";

import coursesRouter from "./routes/courses.route.js";

import usersRouter from "./routes/users.route.js";

import productsRouter from "./routes/products.route.js";

import ordersRouter from "./routes/orders.route.js";

import path from "path";

dotenv.config();

const url = process.env.MONGO_URI;

mongoose.connect(url).then(() => {
  console.log("Mongo db server started");
});

const app = express();

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(express.json());

app.use(cors());

app.use("/api/courses", coursesRouter);

app.use("/api/users", usersRouter);

app.use("/api/products", productsRouter);

app.use("/api/orders", ordersRouter);

app.all("{*splat}", (req, res, next) => {
  return res.status(404).json({
    status: "ERROR",
    data: {
      msg: "route not found",
    },
  });
});

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    status: err.statusText || "ERROR",
    message: err.message || "something went wrong",
    code: err.statusCode || 500,
    data: null,
  });
});

// app.listen(process.env.PORT || 4000, () => {

//     console.log('listening on port : 4000');

// });

if (process.env.NODE_ENV !== "production") {
  app.listen(process.env.PORT || 4000, () => {
    console.log("listening on port : 4000");
  });
}

export default app;
