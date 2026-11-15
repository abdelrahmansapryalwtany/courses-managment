import { validationResult } from "express-validator";

import { SUCCESS, ERROR, FAIL } from "../utils/httpStatusTest.js";

import Product from "../models/product.model.js";

import appError from "../utils/appError.js";

import { asyncWrapper } from "../middlewares/asyncWrapper.js";


const getAllProducts = asyncWrapper(
    async (req, res) => {


        const limit = +req.query.limit || 10;
        const page = +req.query.page || 1;
        const offset = (page - 1) * limit;

        const products = await Product.find({}, { "__v": false })
            .limit(limit)
            .skip(offset);

        const totalProducts = await Product.countDocuments();

        const totalPages = Math.ceil(totalProducts / limit);

        res.json({ status: SUCCESS, data: { products, totalPages, currentPage: page } });
    }
);


const getProduct = asyncWrapper(
    async (req, res, next) => {

        const product = await Product.findById(req.params.productId);

        if (!product) {
            const error = appError.create(
                'Product not found',
                404,
                FAIL
            );

            return next(error);
        }

        return res.json({
            status: SUCCESS,
            data: { product }
        });
    }
);


const addProduct = asyncWrapper(
    async (req, res, next) => {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const error = appError.create(
                errors.array(),
                400,
                FAIL
            );

            return next(error);
        }

        const newProduct = new Product({
            ...req.body,
            image: req.file.filename
        });

        await newProduct.save();

        return res.status(201).json({
            status: SUCCESS,
            data: { product: newProduct }
        });
    }
);


// const updateProduct = asyncWrapper(
//     async (req, res) => {

//         const productId = req.params.productId;

//         const updatedProduct = await Product.findByIdAndUpdate(
//             productId,
//             { $set: { ...req.body } },
//             { returnDocument: "after" }
//         );

//         return res.status(200).json({
//             status: SUCCESS,
//             data: { product: updatedProduct }
//         });
//     }
// );

const updateProduct = asyncWrapper(
    async (req, res) => {

        const productId = req.params.productId;

        const updateData = {
            ...req.body
        };

        if (req.file) {
            updateData.image = req.file.filename;
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: updateData },
            { returnDocument: "after" }
        );

        return res.status(200).json({
            status: SUCCESS,
            data: { product: updatedProduct }
        });
    }
);


const deleteProduct = asyncWrapper(
    async (req, res) => {

        await Product.findByIdAndDelete(req.params.productId);

        return res.status(200).json({
            status: SUCCESS,
            data: null
        });
    }
);

const getCategories = asyncWrapper(
    async (req, res) => {

        const categories = await Product.distinct('category');

        return res.json({
            status: SUCCESS,
            data: { categories }
        });
    }
);

const getCategoryProducts = asyncWrapper(
    async (req, res) => {

        const limit = +req.query.limit || 10;
        const page = +req.query.page || 1;
        const offset = (page - 1) * limit;

        const products = await Product.find({
            category: req.params.category
        }).limit(limit).skip(offset);

        const totalProducts = await Product.countDocuments({ category: req.params.category });

        const totalPages = Math.ceil(totalProducts / limit);

        return res.json({
            status: SUCCESS,
            data: { products, totalPages, currentPage: page }
        });
    }
);


export default {
    getAllProducts,
    getProduct,
    addProduct,
    updateProduct,
    deleteProduct,
    getCategories,
    getCategoryProducts
};