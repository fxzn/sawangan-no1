import express from 'express';
import cors from "cors";
import { errorMiddleware } from '../middleware/error-middleware.js';
import publicRoute from '../route/public-route.js';
import router from '../route/api.js';
import adminRouter from '../route/admin-route.js';
// import path from 'path';
// import { fileURLToPath } from 'url';




export const web = express();


// Untuk mendapatkan __dirname (karena pakai ES Module)
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// ✅ Serve static file dari public/uploads ke URL /uploads
// web.use('/uploads', express.static(path.join(__dirname, '../../public/uploads')));

web.use(express.json());
web.use(cors());

web.use(publicRoute);
web.use(router);
web.use(adminRouter);

web.use(errorMiddleware);

