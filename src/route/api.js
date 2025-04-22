import { Router } from 'express';
import { authMiddleware } from '../middleware/auth-middleware.js';
import { changePassword, getProfile, logout, updateProfile, uploadAvatar } from '../controller/user-controller.js';
import upload from '../utils/avatar.js';


const router = Router();
router.use(authMiddleware);

// Tambahkan route yang membutuhkan autentikasi di sini
router.delete('/api/auth/logout', logout);
router.get('/api/profile', getProfile);
router.patch('/api/profile', updateProfile);
// router.post('/api/profile/avatar', upload.single('avatar'), uploadAvatar);
// router.post('/api/profile/avatar',upload.single('avatar'),uploadAvatar);
router.post('/api/profile/avatar', upload.single('avatar'), uploadAvatar);
router.patch('/api/profile/changepassword', changePassword);


export default router
