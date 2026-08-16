import mongoose from "mongoose";
import validator from "validator";
import userRoles from "../utils/userRoles.js";

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: validator.isEmail,
            message: 'Please enter a valid email'
        }
    },
    password: {
        type: String,
        required: true
    },
    token: {
        type: String,
    },
    role: {
        type: String,
        enum: [userRoles.ADMIN, userRoles.USER, userRoles.MANAGER],
        default: userRoles.USER
    },
    avatar: {
        type: String,
        default: 'uploads/default-avatar.png'
    }   
},
    {
        timestamps: true
    })
const User = mongoose.model('User', userSchema);
export default User;