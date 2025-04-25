import { Router } from 'express';
import { adminMiddleware, authMiddleware } from '../middleware/auth-middleware.js';
import { deleteUser, getAllUsersForAdmin } from '../controller/user-controller.js';
import { addProduct, deleteProduct, updateProduct } from '../controller/product-controller.js';
import { uploadProductImageOptional } from '../utils/upload.js';




const adminRouter = Router();
adminRouter.use(authMiddleware);
adminRouter.use(adminMiddleware);

adminRouter.get('/api/admin/users', getAllUsersForAdmin);
adminRouter.delete('/api/admin/users/:id', deleteUser);
adminRouter.post('/api/admin/products', addProduct);
adminRouter.patch('/api/admin/products/:id', uploadProductImageOptional, updateProduct);
// adminRouter.patch('/api/admin/products/:id', productController.updateProduct);
adminRouter.delete('/api/admin/products/:id', deleteProduct);

export default adminRouter;