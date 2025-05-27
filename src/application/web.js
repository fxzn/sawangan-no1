import express from 'express';
import cors from 'cors';
import { errorMiddleware } from '../middleware/error-middleware.js';
import publicRoute from '../route/public-route.js';
import router from '../route/api.js';
import adminRouter from '../route/admin-route.js';
import webhookRouter from '../route/webhook-route.js';




export const web = express();
web.use((req, res, next) => {
  if (req.originalUrl === '/api/v1/payment' && req.method === 'POST') {
    let rawBody = '';
    req.setEncoding('utf8');
    req.on('data', chunk => rawBody += chunk);
    req.on('end', () => {
      req.rawBody = rawBody;
      next();
    });
  } else {
    next();
  }
});

web.use(webhookRouter);
// web.use(webhookRouter)

web.use(cors())
web.use(express.json());

web.use(publicRoute);
web.use(router);
web.use(adminRouter);


web.use(errorMiddleware);

