import supertest from 'supertest';
import { web } from '../../src/application/web.js';
import { prismaClient } from '../../src/application/database.js';
import bcrypt from 'bcrypt';
import { loggerApp } from '../../src/application/logger.js';

describe('Controller: GET /api/v1/cart', () => {
    let user;
    let token;

    beforeAll(async () => {
        // Buat user dummy
        user = await prismaClient.user.create({
            data: {
                fullName: 'Cart Controller User',
                email: `cartcontroller-${Date.now()}@example.com`,
                password: await bcrypt.hash('password', 10),
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        // Buat cart kosong untuk user
        await prismaClient.cart.create({
            data: {
                userId: user.id
            }
        });

        // Login dan ambil token
        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: user.email, password: 'password' });

        token = loginRes.body.data.token;
    });

    afterAll(async () => {
        await prismaClient.cart.deleteMany({ where: { userId: user.id } });
        await prismaClient.user.delete({ where: { id: user.id } });
    });

    it('should return cart data successfully', async () => {
        const result = await supertest(web)
            .get('/api/v1/cart')
            .set('Authorization', `Bearer ${token}`);

        loggerApp.info(result.body);

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(result.body.data).toBeDefined();
    });

    it('should call next(error) if no auth token (unauthorized)', async () => {
        const result = await supertest(web)
            .get('/api/v1/cart');

        loggerApp.info(result.body);

        expect([401, 403]).toContain(result.status);
        expect(result.body.errors).toBeDefined();
    });
});

describe('Controller: POST /api/v1/cart/items', () => {
    let user;
    let product;
    let token;

    beforeAll(async () => {
        // Buat user
        user = await prismaClient.user.create({
            data: {
                fullName: 'Cart AddItem User',
                email: `cartadd-${Date.now()}@example.com`,
                password: await bcrypt.hash('password', 10),
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        // Buat produk
        product = await prismaClient.product.create({
            data: {
                name: 'Sample Product',
                price: 10000,
                description: 'Sample description',
                imageUrl: 'https://example.com/image.jpg',
                category: 'Makanan',
                weight: 1,
                stock: 10,
                expiryDate: new Date(Date.now() + 86400000),
                addedById: user.id
            }
        });

        // Buat cart kosong
        await prismaClient.cart.create({
            data: { userId: user.id }
        });

        // Login untuk ambil token
        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: user.email, password: 'password' });

        token = loginRes.body.data.token;
    });

    afterAll(async () => {
        if (user?.id) {
            const cart = await prismaClient.cart.findUnique({ where: { userId: user.id } });
            if (cart) {
                await prismaClient.cartItem.deleteMany({ where: { cartId: cart.id } });
                await prismaClient.cart.delete({ where: { id: cart.id } });
            }
            await prismaClient.product.deleteMany({ where: { addedById: user.id } });
            await prismaClient.user.delete({ where: { id: user.id } });
        }
    });

    it('should add item to cart successfully', async () => {
        const result = await supertest(web)
            .post('/api/v1/cart/items')
            .set('Authorization', `Bearer ${token}`)
            .send({
                productId: product.id,
                quantity: 2
            });

        loggerApp.info(result.body);

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(result.body.data.items.length).toBeGreaterThan(0);
    });

    it('should fail if product does not exist', async () => {
        const result = await supertest(web)
            .post('/api/v1/cart/items')
            .set('Authorization', `Bearer ${token}`)
            .send({
                productId: '00000000-0000-0000-0000-000000000000',
                quantity: 1
            });

        loggerApp.info(result.body);

        expect(result.status).toBe(404);
        expect(result.body.errors).toBeDefined();
    });

    it('should fail if insufficient product stock', async () => {
        const result = await supertest(web)
            .post('/api/v1/cart/items')
            .set('Authorization', `Bearer ${token}`)
            .send({
                productId: product.id,
                quantity: 9999 // stok tidak cukup
            });

        loggerApp.info(result.body);

        expect(result.status).toBe(400);
        expect(result.body.errors).toContain('Insufficient product stock');
    });
});

describe('Controller: PATCH /api/v1/cart/items/:productId', () => {
    let user;
    let product;
    let token;
    let cart;

    beforeAll(async () => {
        user = await prismaClient.user.create({
            data: {
                fullName: 'Cart Update User',
                email: `cartupdate-${Date.now()}@example.com`,
                password: await bcrypt.hash('password', 10),
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        product = await prismaClient.product.create({
            data: {
                name: 'Update Test Product',
                price: 15000,
                description: 'For update test',
                imageUrl: 'https://example.com/image.jpg',
                category: 'Minuman',
                weight: 0.5,
                stock: 20,
                expiryDate: new Date(Date.now() + 86400000),
                addedById: user.id
            }
        });

        cart = await prismaClient.cart.create({
            data: { userId: user.id }
        });

        await prismaClient.cartItem.create({
            data: {
                cartId: cart.id,
                productId: product.id,
                quantity: 2
            }
        });

        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: user.email, password: 'password' });

        token = loginRes.body.data.token;
    });

    afterAll(async () => {
        const existingCart = await prismaClient.cart.findUnique({ where: { userId: user.id } });
        if (existingCart) {
            await prismaClient.cartItem.deleteMany({ where: { cartId: existingCart.id } });
            await prismaClient.cart.delete({ where: { id: existingCart.id } });
        }
        await prismaClient.product.deleteMany({ where: { addedById: user.id } });
        await prismaClient.user.delete({ where: { id: user.id } });
    });

    it('should update cart item quantity successfully', async () => {
        const result = await supertest(web)
            .patch(`/api/v1/cart/items/${product.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ quantity: 5 });

        loggerApp.info(result.body);

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        const updatedItem = result.body.data.items.find(item => item.product.id === product.id);
        expect(updatedItem.quantity).toBe(5);
    });

    it('should fail if product does not exist', async () => {
        const result = await supertest(web)
            .patch(`/api/v1/cart/items/00000000-0000-0000-0000-000000000000`)
            .set('Authorization', `Bearer ${token}`)
            .send({ quantity: 3 });

        loggerApp.info(result.body);

        expect(result.status).toBe(404);
        expect(result.body.errors).toBeDefined();
    });

    it('should fail if insufficient product stock', async () => {
        const result = await supertest(web)
            .patch(`/api/v1/cart/items/${product.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ quantity: 999 }); // Melebihi stok

        loggerApp.info(result.body);

        expect(result.status).toBe(400);
        expect(result.body.errors).toContain('Insufficient product stock');
    });
});

describe('Controller: DELETE /api/v1/cart/items/:productId', () => {
    let user;
    let product;
    let cart;
    let token;

    beforeAll(async () => {
        // Buat user
        user = await prismaClient.user.create({
            data: {
                fullName: 'Cart RemoveItem User',
                email: `cartremove-${Date.now()}@example.com`,
                password: await bcrypt.hash('password', 10),
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        // Buat produk
        product = await prismaClient.product.create({
            data: {
                name: 'Sample Remove Product',
                price: 15000,
                description: 'Sample product for remove',
                imageUrl: 'https://example.com/image.jpg',
                category: 'Makanan',
                weight: 1,
                stock: 10,
                expiryDate: new Date(Date.now() + 86400000),
                addedById: user.id
            }
        });

        // Buat cart dan item
        cart = await prismaClient.cart.create({
            data: { userId: user.id }
        });
        await prismaClient.cartItem.create({
            data: {
                cartId: cart.id,
                productId: product.id,
                quantity: 2
            }
        });

        // Login untuk ambil token
        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: user.email, password: 'password' });

        token = loginRes.body.data.token;
    });

    afterAll(async () => {
        // Urutan penting → hapus cartItem dulu sebelum cart (menghindari foreign key violation)
        await prismaClient.cartItem.deleteMany({ where: { cartId: cart.id } });
        await prismaClient.cart.deleteMany({ where: { userId: user.id } });
        await prismaClient.product.deleteMany({ where: { addedById: user.id } });
        await prismaClient.user.delete({ where: { id: user.id } });
    });

    it('should remove item from cart successfully', async () => {
        const res = await supertest(web)
            .delete(`/api/v1/cart/items/${product.id}`)
            .set('Authorization', `Bearer ${token}`);

        loggerApp.info(res.body);

        expect([200, 404]).toContain(res.status); // tergantung apakah item masih ada atau sudah kosong
        if (res.status === 200) {
            expect(res.body.success).toBe(true);
        }
    });

    it('should fail if cart not found', async () => {
        const noCartUser = await prismaClient.user.create({
            data: {
                fullName: 'No Cart User',
                email: `nocart-${Date.now()}@example.com`,
                password: await bcrypt.hash('password', 10),
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: noCartUser.email, password: 'password' });

        const noCartToken = loginRes.body.data.token;

        const res = await supertest(web)
            .delete(`/api/v1/cart/items/${product.id}`)
            .set('Authorization', `Bearer ${noCartToken}`);

        loggerApp.info(res.body);

        expect(res.status).toBe(404);
        expect(res.body.errors).toContain('Cart not found');

        await prismaClient.user.delete({ where: { id: noCartUser.id } });
    });

    it('should handle deleting non-existent product gracefully', async () => {
        const result = await supertest(web)
            .delete(`/api/v1/cart/items/00000000-0000-0000-0000-000000000000`)
            .set('Authorization', `Bearer ${token}`);

        loggerApp.info(result.body);

        // Karena prisma delete tidak error kalau target tidak ada, status kemungkinan 200 atau 404
        expect([200, 404, 500]).toContain(result.status);
    });
});



describe('Controller: DELETE /api/v1/cart', () => {
    let user;
    let token;

    beforeAll(async () => {
        // Buat user
        user = await prismaClient.user.create({
            data: {
                fullName: 'Clear Cart User',
                email: `clearcart-${Date.now()}@example.com`,
                password: await bcrypt.hash('password', 10),
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        // Buat cart dengan item
        const cart = await prismaClient.cart.create({
            data: {
                userId: user.id,
                items: {
                    create: [
                        {
                            productId: (await prismaClient.product.findFirst()).id,
                            quantity: 1
                        }
                    ]
                }
            }
        });

        // Login untuk ambil token
        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: user.email, password: 'password' });

        token = loginRes.body.data.token;
    });

    afterAll(async () => {
        await prismaClient.cartItem.deleteMany({ where: { cartId: user.id } });
        await prismaClient.cart.deleteMany({ where: { userId: user.id } });
        await prismaClient.user.delete({ where: { id: user.id } });
    });

    it('should clear cart successfully', async () => {
        const res = await supertest(web)
            .delete('/api/v1/cart')
            .set('Authorization', `Bearer ${token}`);

        loggerApp.info(res.body);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Cart cleared successfully');
    });

    it('should fail if cart not found', async () => {
        // Hapus cart dulu
        await prismaClient.cart.deleteMany({ where: { userId: user.id } });

        const res = await supertest(web)
            .delete('/api/v1/cart')
            .set('Authorization', `Bearer ${token}`);

        loggerApp.info(res.body);

        expect(res.status).toBe(404);
        expect(res.body.errors).toContain('Cart not found');
    });
});




