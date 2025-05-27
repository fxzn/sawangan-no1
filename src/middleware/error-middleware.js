import multer from 'multer';
import { ResponseError } from "../error/response-error.js";

const errorMiddleware = async (err, req, res, next) => {
    if (!err) {
        next();
        return;
    }

    if (err instanceof ResponseError) {
        res.status(err.status).json({
            errors: err.message
        }).end();
    } else if (err instanceof multer.MulterError) {
        res.status(400).json({
            errors: err.message
        }).end();
    } else if (err.message && (
        err.message.includes('Only JPEG') ||
        err.message.includes('Only JPG') ||
        err.message.includes('Only PNG') ||
        err.message.includes('Only WEBP') ||
        err.message.includes('Unexpected field') || 
        err.message.includes('No file') || 
        err.message.includes('File too large')
    )) {
        // Tangkap error umum terkait file upload (fileFilter, no file, dll)
        res.status(400).json({
            errors: err.message
        }).end();
    } else {
        console.error(err);
        res.status(500).json({
            errors: err.message || 'Internal server error'
        }).end();
    }
};

export { errorMiddleware };
