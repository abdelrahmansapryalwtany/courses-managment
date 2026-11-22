import appError from "../utils/appError.js";
import { FAIL } from "../utils/httpStatusTest.js";

export default (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      const error = appError.create("You are not logged in", 401, FAIL);
      return next(error);
    }
    if (!roles.includes(req.user.role)) {
      const error = appError.create(
        "You are not allowed to perform this action",
        403,
        FAIL,
      );
      return next(error);
    }
    next();
  };
};
