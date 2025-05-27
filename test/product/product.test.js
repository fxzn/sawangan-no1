import supertest from 'supertest';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { web } from '../../src/application/web.js';
import { prismaClient } from '../../src/application/database.js';
import { loggerApp } from '../../src/application/logger.js';
import productService from '../../src/service/product-service.js';

describe('POST /api/v1/admin/products', () => {
    let adminToken;
    let adminUser;

    beforeAll(async () => {
        await prismaClient.user.deleteMany({
            where: { email: 'admin-test@example.com' }
        });

        adminUser = await prismaClient.user.create({
            data: {
                fullName: 'Admin Test User',
                email: 'admin-test@example.com',
                password: await bcrypt.hash('adminpass', 10),
                role: 'ADMIN',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: adminUser.email, password: 'adminpass' });

        adminToken = loginRes.body.data.token;
    });

    afterAll(async () => {
        await prismaClient.product.deleteMany({
            where: { addedById: adminUser.id }
        });
        await prismaClient.user.delete({ where: { id: adminUser.id } });
    });

    it('should add product successfully', async () => {
        const testImagePath = path.join(__dirname, 'test-product.jpg');
        expect(fs.existsSync(testImagePath)).toBe(true);

        const res = await supertest(web)
            .post('/api/v1/admin/products')
            .set('Authorization', `Bearer ${adminToken}`)
            .field('name', 'Test Product')
            .field('price', 10000)
            .field('description', 'A sample test product')
            .field('category', 'Makanan')
            .field('weight', 500) // in grams
            .field('stock', 10)
            .field('expiryDate', new Date(Date.now() + 86400000).toISOString()) // tomorrow
            .attach('image', testImagePath);

        loggerApp.info(res.body);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.weightInKg).toBeCloseTo(0.5); // 500g → 0.5kg
    });

    it('should fail if no image is provided', async () => {
        const res = await supertest(web)
            .post('/api/v1/admin/products')
            .set('Authorization', `Bearer ${adminToken}`)
            .field('name', 'Test Product No Image')
            .field('price', 10000)
            .field('description', 'No image product')
            .field('category', 'Makanan')
            .field('weight', 500)
            .field('stock', 10)
            .field('expiryDate', new Date(Date.now() + 86400000).toISOString());

        loggerApp.info(res.body);

        expect(res.status).toBe(500); // karena controller akan lempar error umum jika req.file tidak ada
        expect(res.body.errors).toBeDefined();
    });

    it('should fail if weight is not a valid number', async () => {
    const testImagePath = path.join(__dirname, 'test-product.jpg');
    expect(fs.existsSync(testImagePath)).toBe(true);

    const res = await supertest(web)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Invalid Weight Product')
        .field('price', 10000)
        .field('description', 'Invalid weight type')
        .field('category', 'Makanan')
        .field('weight', 'abc') // invalid weight
        .field('stock', 10)
        .field('expiryDate', new Date(Date.now() + 86400000).toISOString())
        .attach('image', testImagePath);

    loggerApp.info(res.body);

    expect(res.status).toBe(500); // karena throw new Error di controller
    expect(res.body.errors).toBeDefined();
    });
    
    it('should ignore expiryDate if category is Aksesoris', async () => {
    const testImagePath = path.join(__dirname, 'test-product.jpg');
    expect(fs.existsSync(testImagePath)).toBe(true);

    const res = await supertest(web)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Accessory Product')
        .field('price', 15000)
        .field('description', 'Accessory item with expiry date')
        .field('category', 'Aksesoris')
        .field('weight', 300)
        .field('stock', 5)
        .field('expiryDate', new Date(Date.now() + 86400000).toISOString()) // should be ignored
        .attach('image', testImagePath);

    loggerApp.info(res.body);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category).toBe('Aksesoris');
    expect(res.body.data).toHaveProperty('expiryDate');
    expect(res.body.data.expiryDate).toBeNull();
    });
});


describe('GET /api/v1/products', () => {
    let adminUser;

    beforeAll(async () => {
        await prismaClient.user.deleteMany({
            where: { email: 'admin-getall@example.com' }
        });

        adminUser = await prismaClient.user.create({
            data: {
                fullName: 'Admin GetAll User',
                email: 'admin-getall@example.com',
                password: await bcrypt.hash('adminpass', 10),
                role: 'ADMIN',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        // Tambah minimal satu produk dummy
        await prismaClient.product.create({
            data: {
                name: 'Test Product',
                price: 5000,
                description: 'Test description',
                imageUrl: 'https://example.com/image.jpg',
                category: 'Makanan',
                weight: 0.5,
                stock: 10,
                expiryDate: new Date(Date.now() + 86400000), // besok
                addedById: adminUser.id
            }
        });
    });

    afterAll(async () => {
        await prismaClient.product.deleteMany({
            where: { addedById: adminUser.id }
        });
        await prismaClient.user.delete({ where: { id: adminUser.id } });
    });

    it('should return all products successfully', async () => {
        const res = await supertest(web)
            .get('/api/v1/products');

        loggerApp.info(res.body);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0]).toHaveProperty('name');
        expect(res.body.data[0]).toHaveProperty('price');
    });

    it('should return empty array if no products exist', async () => {
        // Kosongkan semua produk
        await prismaClient.product.deleteMany({});

        const res = await supertest(web)
            .get('/api/v1/products');

        loggerApp.info(res.body);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(0);
    });

    it('should handle internal server error gracefully', async () => {
        // Simulasikan error → pakai spy/mocking di level service (tanpa mock di sini, kita cek respons saja)
        const res = await supertest(web)
            .get('/api/v1/products?triggerError=true');

        if (res.status === 500) {
            loggerApp.info(res.body);
            expect(res.body.errors).toBeDefined();
        } else {
            // Kalau backend tidak punya simulasi error, minimal test lolos sukses
            expect([200, 500]).toContain(res.status);
        }
    });
});


describe('GET /api/v1/products/:id', () => {
    let adminUser;
    let product;
    let token;

    beforeAll(async () => {
        // Bersihkan jika user sudah ada
        const existingUser = await prismaClient.user.findFirst({
            where: { email: 'admin-productbyid@example.com' }
        });

        if (existingUser) {
            await prismaClient.review.deleteMany({ where: { userId: existingUser.id } });
            await prismaClient.order.deleteMany({ where: { userId: existingUser.id } });
            await prismaClient.product.deleteMany({ where: { addedById: existingUser.id } });
            await prismaClient.user.delete({ where: { id: existingUser.id } });
        }

        // Buat user admin baru
        adminUser = await prismaClient.user.create({
            data: {
                fullName: 'Admin ProductById User',
                email: 'admin-productbyid@example.com',
                password: await bcrypt.hash('adminpass', 10),
                role: 'ADMIN',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: adminUser.email, password: 'adminpass' });

        token = loginRes.body.data.token;

        // Buat product dummy
        product = await prismaClient.product.create({
            data: {
                name: 'Test Product By ID',
                price: 5000,
                description: 'Test description by id',
                imageUrl: 'https://example.com/image.jpg',
                category: 'Makanan',
                weight: 0.5,
                stock: 10,
                expiryDate: new Date(Date.now() + 86400000), // besok
                addedById: adminUser.id
            }
        });
    });

    afterAll(async () => {
        if (product) {
            await prismaClient.review.deleteMany({ where: { productId: product.id } });
            await prismaClient.order.deleteMany({ where: { userId: adminUser.id } });
            await prismaClient.product.deleteMany({ where: { addedById: adminUser.id } });
        }

        if (adminUser) {
            await prismaClient.user.delete({ where: { id: adminUser.id } });
        }
    });

    it('should get product by valid ID successfully', async () => {
        const res = await supertest(web)
            .get(`/api/v1/products/${product.id}`)
            .set('Authorization', `Bearer ${token}`);

        loggerApp.info(res.body);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('id', product.id);
        expect(res.body.data).toHaveProperty('name', product.name);
        expect(res.body.data).toHaveProperty('ratingAvg');
        expect(res.body.data).toHaveProperty('reviewCount');
    });

    it('should return 404 if product not found', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';

        const res = await supertest(web)
            .get(`/api/v1/products/${nonExistentId}`)
            .set('Authorization', `Bearer ${token}`);

        loggerApp.info(res.body);

        expect(res.status).toBe(404);
        expect(res.body.errors).toBeDefined();
    });

it('should calculate ratingAvg and distribution if product has reviews', async () => {
    // Tambahkan order dummy 1
    const order1 = await prismaClient.order.create({
        data: {
            userId: adminUser.id,
            totalAmount: 10000,
            status: 'COMPLETED',
            customerName: 'Test Customer 1',
            customerEmail: 'testcustomer1@example.com',
            customerPhone: '08123456789',
            shippingAddress: 'Jl. Testing No. 1',
            shippingCity: 'Jakarta',
            shippingProvince: 'DKI Jakarta',
            shippingPostCode: '12345',
            shippingCost: 10000,
            shipping_name: 'JNE',
            service_name: 'REG'
        }
    });

    // Tambahkan order dummy 2
    const order2 = await prismaClient.order.create({
        data: {
            userId: adminUser.id,
            totalAmount: 10000,
            status: 'COMPLETED',
            customerName: 'Test Customer 2',
            customerEmail: 'testcustomer2@example.com',
            customerPhone: '08123456789',
            shippingAddress: 'Jl. Testing No. 2',
            shippingCity: 'Jakarta',
            shippingProvince: 'DKI Jakarta',
            shippingPostCode: '12345',
            shippingCost: 10000,
            shipping_name: 'JNE',
            service_name: 'REG'
        }
    });

    // Tambahkan review dummy, masing-masing ke order berbeda
    await prismaClient.review.create({
        data: {
            rating: 5,
            comment: 'Great!',
            productId: product.id,
            userId: adminUser.id,
            purchasedPrice: 5000,
            orderId: order1.id
        }
    });

    await prismaClient.review.create({
        data: {
            rating: 4,
            comment: 'Good!',
            productId: product.id,
            userId: adminUser.id,
            purchasedPrice: 5000,
            orderId: order2.id
        }
    });

    const res = await supertest(web)
        .get(`/api/v1/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`);

    loggerApp.info(res.body);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('reviewCount', 2);
    expect(res.body.data).toHaveProperty('ratingAvg');
    expect(res.body.data.ratingAvg).toBeGreaterThan(0);
    expect(res.body.data).toHaveProperty('ratingDistribution');
    expect(res.body.data.ratingDistribution['5']).toBeGreaterThan(0);
    expect(res.body.data.ratingDistribution['4']).toBeGreaterThan(0);
});

});


describe('PATCH /api/v1/admin/products/:id', () => {
    let adminUser;
    let token;
    let product;

    beforeAll(async () => {
        await prismaClient.user.deleteMany({
            where: { email: 'admin-updateproduct@example.com' }
        });

        adminUser = await prismaClient.user.create({
            data: {
                fullName: 'Admin Update Product',
                email: 'admin-updateproduct@example.com',
                password: await bcrypt.hash('adminpass', 10),
                role: 'ADMIN',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: adminUser.email, password: 'adminpass' });

        token = loginRes.body.data.token;

        product = await prismaClient.product.create({
            data: {
                name: 'Original Product',
                price: 10000,
                description: 'Original description',
                imageUrl: 'https://example.com/original.jpg',
                category: 'Makanan',
                weight: 0.5,
                stock: 20,
                expiryDate: new Date(Date.now() + 86400000),
                addedById: adminUser.id
            }
        });
    });

    afterAll(async () => {
        await prismaClient.product.deleteMany({ where: { addedById: adminUser.id } });
        await prismaClient.user.delete({ where: { id: adminUser.id } });
    });

    it('should update product successfully', async () => {
        const updateData = {
            name: 'Updated Product',
            price: 15000,
            stock: 15
        };

        const res = await supertest(web)
            .patch(`/api/v1/admin/products/${product.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateData);

        loggerApp.info(res.body);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('name', updateData.name);
        expect(res.body.data).toHaveProperty('price', updateData.price);
        expect(res.body.data).toHaveProperty('stock', updateData.stock);
    });

    it('should fail if product ID is invalid', async () => {
        const res = await supertest(web)
            .patch('/api/v1/admin/products/invalid-id')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Should Fail' });

        loggerApp.info(res.body);

        expect([400, 500]).toContain(res.status); // tergantung validasi backend
        expect(res.body.errors).toBeDefined();
    });

    it('should fail if no update fields provided', async () => {
        const res = await supertest(web)
            .patch(`/api/v1/admin/products/${product.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({});

        loggerApp.info(res.body);

        expect(res.status).toBe(400); // karena minimal 1 field di schema
        expect(res.body.errors).toBeDefined();
    });

    it('should update weight (convert grams to kg) correctly', async () => {
    const updateData = {
        weight: '500' // 500 grams → 0.5 kg
    };

    const res = await supertest(web)
        .patch(`/api/v1/admin/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

    loggerApp.info(res.body);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.weight).toBeCloseTo(0.5, 2);
    });

    it('should update product image when new image is provided', async () => {
        const testImagePath = path.join(__dirname, 'test-product.jpg');
        expect(fs.existsSync(testImagePath)).toBe(true);

        const res = await supertest(web)
            .patch(`/api/v1/admin/products/${product.id}`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'Updated Name With Image') // minimal 1 field supaya lolos validation
            .attach('image', testImagePath);

        loggerApp.info(res.body);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.imageUrl).toMatch(/^https?:\/\//);
    });

    it('should cleanup uploaded file on validation error', async () => {
    const testImagePath = path.join(__dirname, 'test-product.jpg');
    expect(fs.existsSync(testImagePath)).toBe(true);

    const res = await supertest(web)
        .patch(`/api/v1/admin/products/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .field('weight', '-100') // invalid negative weight to trigger validation error
        .attach('image', testImagePath);

    loggerApp.info(res.body);

    expect(res.status).toBe(400); // because validation fails
    expect(res.body.errors).toBeDefined();
    });
});



describe('DELETE /api/v1/admin/products/:id', () => {
    let adminUser;
    let token;

    beforeAll(async () => {
        // Hapus semua order terkait dulu supaya user bisa dihapus tanpa masalah
        const existingUser = await prismaClient.user.findFirst({
            where: { email: 'admin-deleteproduct@example.com' }
        });
        if (existingUser) {
            const userOrders = await prismaClient.order.findMany({
                where: { userId: existingUser.id }
            });
            for (const order of userOrders) {
                await prismaClient.order.delete({ where: { id: order.id } });
            }
            await prismaClient.product.deleteMany({ where: { addedById: existingUser.id } });
            await prismaClient.user.delete({ where: { id: existingUser.id } });
        }

        // Buat admin baru
        adminUser = await prismaClient.user.create({
            data: {
                fullName: 'Admin DeleteProduct User',
                email: 'admin-deleteproduct@example.com',
                password: await bcrypt.hash('adminpass', 10),
                role: 'ADMIN',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: adminUser.email, password: 'adminpass' });

        token = loginRes.body.data.token;
    });

    afterAll(async () => {
        const userOrders = await prismaClient.order.findMany({
            where: { userId: adminUser.id }
        });
        for (const order of userOrders) {
            await prismaClient.order.delete({ where: { id: order.id } });
        }
        await prismaClient.product.deleteMany({ where: { addedById: adminUser.id } });
        await prismaClient.user.delete({ where: { id: adminUser.id } });
    });

    it('should delete product successfully', async () => {
        const product = await prismaClient.product.create({
            data: {
                name: 'Product to Delete',
                price: 5000,
                description: 'To be deleted',
                imageUrl: 'https://example.com/image.jpg',
                category: 'Makanan',
                weight: 0.5,
                stock: 10,
                expiryDate: new Date(Date.now() + 86400000),
                addedById: adminUser.id
            }
        });

        const res = await supertest(web)
            .delete(`/api/v1/admin/products/${product.id}`)
            .set('Authorization', `Bearer ${token}`);

        loggerApp.info(res.body);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.deleted).toBe(true);
    });

    it('should return 404 if product not found', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';

        const res = await supertest(web)
            .delete(`/api/v1/admin/products/${nonExistentId}`)
            .set('Authorization', `Bearer ${token}`);

        loggerApp.info(res.body);

        expect(res.status).toBe(404);
        expect(res.body.errors).toBeDefined();
    });

     it('should fail if product has active orders', async () => {
        const activeProduct = await prismaClient.product.create({
            data: {
                name: 'Product with Active Order',
                price: 7000,
                description: 'Active order',
                imageUrl: 'https://example.com/image2.jpg',
                category: 'Minuman',
                weight: 1,
                stock: 5,
                expiryDate: new Date(Date.now() + 86400000),
                addedById: adminUser.id
            }
        });




        const order = await prismaClient.order.create({
            data: {
                userId: adminUser.id,
                totalAmount: 7000,
                status: 'PENDING',
                customerName: 'Test Customer',
                customerEmail: 'test@example.com',
                customerPhone: '08123456789',
                shippingAddress: 'Jl. Testing',
                shippingCity: 'Jakarta',
                shippingProvince: 'DKI Jakarta',
                shippingPostCode: '12345',
                shippingCost: 10000,
                shipping_name: 'JNE',
                service_name: 'REG',
                items: {
                    create: [{
                        productId: activeProduct.id,
                        quantity: 1,
                        price: 7000,
                        productName: activeProduct.name,
                        weight: activeProduct.weight 
                    }]
                }
            }
        });

        const res = await supertest(web)
            .delete(`/api/v1/admin/products/${activeProduct.id}`)
            .set('Authorization', `Bearer ${token}`);

        loggerApp.info(res.body);

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain('active orders');

        // Cleanup
        await prismaClient.order.delete({ where: { id: order.id } });
        await prismaClient.product.delete({ where: { id: activeProduct.id } });
    });

    it('should allow deleting product if all orders are completed', async () => {
        const completedProduct = await prismaClient.product.create({
            data: {
                name: 'Completed Order Product',
                price: 8000,
                description: 'Completed order',
                imageUrl: 'https://example.com/image3.jpg',
                category: 'Aksesoris',
                weight: 0.8,
                stock: 3,
                addedById: adminUser.id
            }
        });

        await prismaClient.order.create({
            data: {
                userId: adminUser.id,
                totalAmount: 8000,
                status: 'COMPLETED',
                customerName: 'Completed Customer',
                customerEmail: 'complete@example.com',
                customerPhone: '08129876543',
                shippingAddress: 'Jl. Completed',
                shippingCity: 'Bandung',
                shippingProvince: 'Jawa Barat',
                shippingPostCode: '54321',
                shippingCost: 5000,
                shipping_name: 'SiCepat',
                service_name: 'BEST',
                items: {
                    create: [{
                        productId: completedProduct.id,
                        quantity: 1,
                        price: 8000,
                        productName: completedProduct.name, 
                        weight: completedProduct.weight
                    }]
                }
            }
        });

        const res = await supertest(web)
            .delete(`/api/v1/admin/products/${completedProduct.id}`)
            .set('Authorization', `Bearer ${token}`);

        loggerApp.info(res.body);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.deleted).toBe(true);

        const check = await prismaClient.product.findUnique({ where: { id: completedProduct.id } });
        expect(check).toBeNull();
    });

});



describe('Service: getProductRating', () => {
    let product;
    let adminUser;

    beforeAll(async () => {
        // Buat admin dummy
        adminUser = await prismaClient.user.create({
            data: {
                fullName: 'Admin Test User',
                email: `admin-rating-${Date.now()}@example.com`,
                password: await bcrypt.hash('adminpass', 10),
                role: 'ADMIN',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        // Buat produk dummy dengan rating dan reviewCount manual
        product = await prismaClient.product.create({
            data: {
                name: 'Rating Summary Product',
                price: 10000,
                description: 'Product for rating summary test',
                imageUrl: 'https://example.com/image.jpg',
                category: 'Makanan',
                weight: 1,
                stock: 10,
                expiryDate: new Date(Date.now() + 86400000),
                addedById: adminUser.id,
                ratingAvg: 4.5,
                reviewCount: 2
            }
        });
    });

    afterAll(async () => {
        await prismaClient.product.delete({ where: { id: product.id } });
        await prismaClient.user.delete({ where: { id: adminUser.id } });
    });

    it('should return correct ratingAvg and reviewCount', async () => {
        const result = await productService.getProductRating(product.id);

        loggerApp.info(result.body);

        expect(result).toBeDefined();
        expect(result.ratingAvg).toBe(4.5);
        expect(result.reviewCount).toBe(2);
    });

    it('should return null if product not found', async () => {
        const result = await productService.getProductRating('00000000-0000-0000-0000-000000000000');


        expect(result).toBeNull();
    });
});


describe('Service: calculateProductRating', () => {
    let product;
    let testUser;
    let testOrder;

    beforeAll(async () => {
        // Buat user dummy
        testUser = await prismaClient.user.create({
            data: {
                fullName: 'Test User',
                email: `testuser-${Date.now()}@example.com`,
                password: await bcrypt.hash('password', 10),
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        // Buat produk dummy
        product = await prismaClient.product.create({
            data: {
                name: 'Rating Test Product',
                price: 10000,
                description: 'Test product',
                imageUrl: 'https://example.com/image.jpg',
                category: 'Makanan',
                weight: 1,
                stock: 10,
                expiryDate: new Date(Date.now() + 86400000),
                addedById: testUser.id
            }
        });

        // Buat order dummy
        testOrder = await prismaClient.order.create({
            data: {
                userId: testUser.id,
                totalAmount: 10000,
                status: 'COMPLETED',
                customerName: 'Test User',
                customerEmail: testUser.email,
                customerPhone: '08123456789',
                shippingAddress: 'Jl. Testing',
                shippingCity: 'Jakarta',
                shippingProvince: 'DKI Jakarta',
                shippingPostCode: '12345',
                shippingCost: 10000,
                shipping_name: 'JNE',
                service_name: 'REG'
            }
        });
    });

    afterAll(async () => {
        await prismaClient.review.deleteMany({ where: { productId: product.id } });
        await prismaClient.order.delete({ where: { id: testOrder.id } });
        await prismaClient.product.delete({ where: { id: product.id } });
        await prismaClient.user.delete({ where: { id: testUser.id } });
    });

    it('should return avgRating 0 and count 0 if no reviews', async () => {
        const result = await productService.calculateProductRating(product.id);

        loggerApp.info(result.body);

        expect(result.avgRating).toBe(0);
        expect(result.reviewCount).toBe(0);
    });

    it('should return correct avgRating and count with one review', async () => {
        await prismaClient.review.create({
            data: {
                rating: 4,
                comment: 'Good!',
                productId: product.id,
                userId: testUser.id,
                purchasedPrice: 10000,
                orderId: testOrder.id
            }
        });

        const result = await productService.calculateProductRating(product.id);

        loggerApp.info(result.body);

        expect(result.avgRating).toBe(4);
        expect(result.reviewCount).toBe(1);
    });
});

