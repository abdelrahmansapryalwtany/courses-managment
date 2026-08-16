import jwt from 'jsonwebtoken';
import appError from '../utils/appError.js';
import { FAIL } from '../utils/httpStatusTest.js';   

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        const error = appError.create('Token not found', 401, FAIL);
        return next(error);
    }
    try {
        const decoded = await jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        const error = appError.create('Invalid token', 401, FAIL);
        return next(error);
    }
};

export { verifyToken };