import supertest from 'supertest';
import { web } from '../../src/application/web.js';
import { prismaClient } from '../../src/application/database.js';
import bcrypt from 'bcrypt';
import { loggerApp } from '../../src/application/logger.js';
import midtransService from '../../src/service/midtrans-service.js';

jest.mock('../../src/service/midtrans-service.js', () => ({
    snap: {
        createTransaction: jest.fn()
    }
}));

describe('Controller: POST /api/v1/checkout', () => {
    jest.setTimeout(15000);
    
    let user;
    let product;
    let token;

    beforeAll(async () => {
        user = await prismaClient.user.create({
            data: {
                fullName: 'Checkout User',
                email: `checkout-${Date.now()}@example.com`,
                password: await bcrypt.hash('password', 10),
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true,
                phone: '081234567890'  // ✅ tambahkan ini
            }

        });

        product = await prismaClient.product.create({
            data: {
                name: 'Checkout Product',
                price: 20000,
                description: 'Product for checkout test',
                imageUrl: 'https://example.com/image.jpg',
                category: 'Makanan',
                weight: 1,
                stock: 5,
                expiryDate: new Date(Date.now() + 86400000),
                addedById: user.id
            }
        });

        const cart = await prismaClient.cart.create({ data: { userId: user.id } });
        await prismaClient.cartItem.create({
            data: {
                cartId: cart.id,
                productId: product.id,
                quantity: 1
            }
        });

        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: user.email, password: 'password' });

        token = loginRes.body.data.token;
    });

    afterAll(async () => {
        await prismaClient.order.deleteMany({ where: { userId: user.id } });
        const cart = await prismaClient.cart.findUnique({ where: { userId: user.id } });
        if (cart) {
            await prismaClient.cartItem.deleteMany({ where: { cartId: cart.id } });
            await prismaClient.cart.delete({ where: { id: cart.id } });
        }
        await prismaClient.product.deleteMany({ where: { addedById: user.id } });
        await prismaClient.user.delete({ where: { id: user.id } });
    });

    it('should process checkout successfully', async () => {
        midtransService.snap.createTransaction.mockResolvedValue({
            redirect_url: 'https://payment.test',
            token: 'fake-token'
        });

        const res = await supertest(web)
            .post('/api/v1/checkout')
            .set('Authorization', `Bearer ${token}`)
            .send({
                destinationId: '6532',
                courier: 'JNE',
                shippingService: 'REG23',
                shippingAddress: 'Jl. Testing No.123',
                shippingCity: 'Jakarta',
                shippingProvince: 'DKI Jakarta',
                shippingPostCode: '12345',
                paymentMethod: 'bank_transfer'
            });

        loggerApp.info(res.body);

        expect([200, 201]).toContain(res.status);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data).toHaveProperty('paymentUrl');
    });

    it('should fail if cart is empty', async () => {
        const emptyUser = await prismaClient.user.create({
            data: {
                fullName: 'Empty Cart User',
                email: `emptycart-${Date.now()}@example.com`,
                password: await bcrypt.hash('password', 10),
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        await prismaClient.cart.create({ data: { userId: emptyUser.id } });

        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: emptyUser.email, password: 'password' });

        const emptyToken = loginRes.body.data.token;

        const res = await supertest(web)
            .post('/api/v1/checkout')
            .set('Authorization', `Bearer ${emptyToken}`)
            .send({
                destinationId: '6532',
                courier: 'JNE',
                shippingService: 'REG23',
                shippingAddress: 'Jl. Testing No.123',
                shippingCity: 'Jakarta',
                shippingProvince: 'DKI Jakarta',
                shippingPostCode: '12345',
                paymentMethod: 'bank_transfer'
            });

        loggerApp.info(res.body);

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain('Cart is empty');

        const emptyCart = await prismaClient.cart.findUnique({ where: { userId: emptyUser.id } });
        if (emptyCart) {
            await prismaClient.cart.delete({ where: { id: emptyCart.id } });
        }
        await prismaClient.user.delete({ where: { id: emptyUser.id } });
    });

    it('should fail if product stock is insufficient', async () => {
    // Pastikan cartItem ada lagi
    const cart = await prismaClient.cart.findUnique({ where: { userId: user.id } });

    await prismaClient.cartItem.create({
        data: {
            cartId: cart.id,
            productId: product.id,
            quantity: 1
        }
    });

    // Naikkan jumlah supaya melebihi stok
    await prismaClient.cartItem.update({
        where: {
            cartId_productId: {
                cartId: cart.id,
                productId: product.id
            }
        },
        data: { quantity: 9999 }
    });

    const res = await supertest(web)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
            destinationId: '6532',
            courier: 'JNE',
            shippingService: 'REG23',
            shippingAddress: 'Jl. Testing No.123',
            shippingCity: 'Jakarta',
            shippingProvince: 'DKI Jakarta',
            shippingPostCode: '12345',
            paymentMethod: 'bank_transfer'
        });

    loggerApp.info(res.body);

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('Insufficient stock');
    });


     it('should handle Midtrans API failure gracefully', async () => {
        const cart = await prismaClient.cart.findUnique({ where: { userId: user.id } });

        // Reset quantity supaya stok cukup
        await prismaClient.cartItem.update({
            where: {
                cartId_productId: {
                    cartId: cart.id,
                    productId: product.id
                }
            },
            data: { quantity: 1 }
        });

        midtransService.snap.createTransaction.mockRejectedValue(new Error('Midtrans API failure'));

        const res = await supertest(web)
            .post('/api/v1/checkout')
            .set('Authorization', `Bearer ${token}`)
            .send({
                destinationId: '6532',
                courier: 'JNE',
                shippingService: 'REG23',
                shippingAddress: 'Jl. Testing No.123',
                shippingCity: 'Jakarta',
                shippingProvince: 'DKI Jakarta',
                shippingPostCode: '12345',
                paymentMethod: 'bank_transfer'
            });

        loggerApp.info(res.body);

        expect(res.status).toBe(500);
        expect(res.body.errors).toContain('Failed to create payment transaction');
    });


    it('should fail if selected shipping service is not available', async () => {
    // Mock komerceService supaya hasilnya tidak cocok
    jest.spyOn(require('../../src/service/komerce-service.js').default, 'calculateShippingCost').mockResolvedValue([
        {
            shipping_name: 'JNE',
            service_name: 'YES',
            price: 10000,
            etd: '1-2 days'
        }
    ]);

    const res = await supertest(web)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
            destinationId: '6532',
            courier: 'POS',  // tidak cocok dengan mock JNE
            shippingService: 'EXPRESS',
            shippingAddress: 'Jl. Testing No.123',
            shippingCity: 'Jakarta',
            shippingProvince: 'DKI Jakarta',
            shippingPostCode: '12345',
            paymentMethod: 'bank_transfer'
        });

    loggerApp.info(res.body);

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('Selected shipping service not available');
});



    // it('should handle Midtrans API failure gracefully', async () => {
    //     midtransService.snap.createTransaction.mockRejectedValue(new Error('Midtrans API failure'));

    //     const res = await supertest(web)
    //         .post('/api/v1/checkout')
    //         .set('Authorization', `Bearer ${token}`)
    //         .send({
    //             destinationId: '6532',
    //             courier: 'JNE',
    //             shippingService: 'REG23',
    //             shippingAddress: 'Jl. Testing No.123',
    //             shippingCity: 'Jakarta',
    //             shippingProvince: 'DKI Jakarta',
    //             shippingPostCode: '12345',
    //             paymentMethod: 'bank_transfer'
    //         });

    //     loggerApp.info(res.body);

    //     expect([400, 500]).toContain(res.status);
    //     expect(res.body.errors).toContain('Failed to create payment transaction');
    // });
});
