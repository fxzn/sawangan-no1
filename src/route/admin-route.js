import { Router } from 'express';
import { adminMiddleware, authMiddleware } from '../middleware/auth-middleware.js';
import { getAllUsersForAdmin } from '../controller/user-controller.js';
import { addProduct } from '../controller/product-controller.js';




const adminRouter = Router();
adminRouter.use(authMiddleware);
adminRouter.use(adminMiddleware);

adminRouter.get('/api/admin/users', getAllUsersForAdmin);
adminRouter.post('/api/admin/products', addProduct);

export default adminRouter;