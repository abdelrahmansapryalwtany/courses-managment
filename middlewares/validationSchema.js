import { body } from "express-validator"

const validationSchema = () => {
    return [
        body('title')
            .notEmpty()
            .withMessage("title is required")
            .isLength({ min: 2 })
            .withMessage("title al least 2 digits"),
        body('price')
            .notEmpty()
            .withMessage("price is required")
    ]
}

export {
    validationSchema
}