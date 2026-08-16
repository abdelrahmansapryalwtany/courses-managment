
import express from 'express';
import {validationSchema} from "../middlewares/validationSchema.js";
import usersControllers from "../controllers/users.controllers.js";
import { verifyToken } from '../middlewares/verifyToken.js';
import multer from 'multer';
import appError from '../utils/appError.js';

const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname + '.' + file.mimetype.split('/')[1]);
    }
});

const fileFilter = (req, file, cb) => {
    const imageType = file.mimetype.split('/')[0];
    if (imageType === 'image') {
        return cb(null, true);
    } else {
        return cb(appError.create('Only image files are allowed!', 400), false);
    }
};

const upload = multer({ storage: diskStorage, fileFilter: fileFilter });
const usersRouter = express.Router();

usersRouter.route('/')
    .get(verifyToken, usersControllers.getAllUsers)

usersRouter.route('/register')
    .post(upload.single('avatar'), usersControllers.register)

usersRouter.route('/login')
    .post(usersControllers.login)


export default usersRouter;