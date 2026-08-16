import jwt from "jsonwebtoken";

export const generateJWT = async (payload) => {

    const token = await jwt.sign(
        payload, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
    );

    return token;
}