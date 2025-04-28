import { Router } from 'express';
import { authMiddleware } from '../middleware/auth-middleware.js';
import { changePassword, getProfile, logout, updateProfile, uploadAvatar } from '../controller/user-controller.js';
import upload from '../utils/avatar.js';
import { getAllProducts, getProductById } from '../controller/product-controller.js';
import { addItemToCart, clearCart, getCart, removeItemFromCart, updateCartItem } from '../controller/cart-controller.js';
import { searchDestinations } from '../controller/checkout-controller.js';
import { getShippingOptions } from '../controller/checkout-controller.js';
import { checkout } from '../controller/checkout-controller.js';


const router = Router();
router.use(authMiddleware);


// auth router
router.delete('/api/v1/auth/logout', logout);

// profile router
router.get('/api/v1/profile', getProfile);
router.patch('/api/v1/profile', updateProfile);
router.post('/api/v1/profile/avatar', upload.single('avatar'), uploadAvatar);
router.patch('/api/v1/profile/changepassword', changePassword);

// product router
router.get('/api/v1/products', getAllProducts);
router.get('/api/v1/products/:id', getProductById);


// keranjang router
router.get('/api/v1/cart', getCart);
router.post('/api/v1/cart/items', addItemToCart);
router.patch('/api/v1/cart/items/:productId', updateCartItem);
router.delete('/api/v1/cart/items/:productId', removeItemFromCart);
router.delete('/api/v1/cart', clearCart);

    
// Checkout router
router.post('/api/v1/checkout', checkout);


// Raja ongkir route
router.get('/api/v1/shipping/options', getShippingOptions);
router.get('/api/v1/shipping/destinations', searchDestinations);



export default router
