// import { ResponseError } from "../error/response-error.js";


// const errorMiddleware = (err, req, res, next) => {
//     if (!err) {
//         next();
//         return;
//     }

//     if (err instanceof ResponseError) {
//         res.status(err.status).json({
//             errors: err.message
//         }).end();
//     }  else {
//         res.status(404).json({
//             errors: err.message
//         }).end();
//     }
// };
// export {
//     errorMiddleware
// }


// error-middleware.js
import { ResponseError } from "../error/response-error.js";

const errorMiddleware = (err, req, res, next) => {
  if (!err) {
    return next();
  }

  if (err instanceof ResponseError) {
    return res.status(err.status).json({
      errors: {
        message: err.message,
        code: err.status
      }
    });
  } else {
    return res.status(404).json({
      errors: {
        message: err.message,
        code: 404
      }
    });
  }
};

export {
  errorMiddleware
};
