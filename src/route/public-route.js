import { Router } from 'express';
import { forgotPassword, googleAuth, login, register, resetPassword } from '../controller/user-controller.js';



const publicRouter = Router();

publicRouter.post('/api/auth/register', register);
publicRouter.post('/api/auth/login', login);
publicRouter.post('/api/auth/forgot-password', forgotPassword);
publicRouter.post('/api/auth/reset-password', resetPassword);
publicRouter.post('/api/auth/google', googleAuth);

export default publicRouter
