import { Router } from 'express';
import { authMiddleware } from '../middleware/auth-middleware.js';
import { changePassword, getProfile, logout, updateProfile, uploadAvatar } from '../controller/user-controller.js';
import upload from '../utils/avatar.js';
import { getAllProducts, getProductById } from '../controller/product-controller.js';
import { addItemToCart, clearCart, getCart, removeItemFromCart, updateCartItem } from '../controller/cart-controller.js';
// import { checkout, getShippingOptions } from '../controller/checkout-controller.js';
import { searchDestinations } from '../controller/checkout-controller.js';
import { getShippingOptions } from '../controller/checkout-controller.js';
import { checkout } from '../controller/checkout-controller.js';


const router = Router();
router.use(authMiddleware);

// Tambahkan route yang membutuhkan autentikasi di sini

// auth router
router.delete('/api/auth/logout', logout);

// profile router
router.get('/api/profile', getProfile);
router.patch('/api/profile', updateProfile);
router.post('/api/profile/avatar', upload.single('avatar'), uploadAvatar);
router.patch('/api/profile/changepassword', changePassword);

// product router
router.get('/api/products', getAllProducts);
router.get('/api/products/:id', getProductById);


// keranjang router
router.get('/api/cart', getCart);
router.post('/api/cart/items', addItemToCart);
router.patch('/api/cart/items/:productId', updateCartItem);
router.delete('/api/cart/items/:productId', removeItemFromCart);
router.delete('/api/cart', clearCart);


// Checkout router
router.post('/api/checkout', checkout);


// Raja ongkir route
// router.get('/api/v1/calculate', getShippingOptions);

router.get('/api/shipping/options', getShippingOptions);
router.get('/api/shipping/destinations', searchDestinations);







export default router
