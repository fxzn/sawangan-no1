import { loggerApp } from "../../src/application/logger.js";
import { web } from "../../src/application/web.js";
import {
    createTestUser,
    createTestProduct,
    createTestWishlist,
    removeAllTestWishlists,
    removeAllTestProducts,
    removeTestUser
} from "./wishlist-utils.test.js";
import supertest from "supertest";

// import {logger} from "../src/application/logging.js";

describe('Wishlist API', () => {
    let user;
    let product;
    let token;

    beforeAll(async () => {
        await createTestUser();
        user = await getTestUser();
        token = 'test'; // Sesuaikan dengan token auth Anda
    });

    beforeEach(async () => {
        await createTestProduct();
        product = await getTestProduct();
    });

    afterEach(async () => {
        await removeAllTestWishlists();
        await removeAllTestProducts();
    });

    afterAll(async () => {
        await removeTestUser();
    });

    describe('POST /api/v1/wishlist', () => {
        it('should can add product to wishlist', async () => {
            const result = await supertest(web)
                .post("/api/v1/wishlist")
                .set('Authorization', token)
                .send({
                    productId: product.id
                });

            loggerApp.info(result.body);

            expect(result.status).toBe(200);
            expect(result.body.data).toBeDefined();
            expect(result.body.data.product.id).toBe(product.id);
            expect(result.body.data.product.name).toBe(product.name);
        });

        it('should reject if product already in wishlist', async () => {
            await createTestWishlist(user.id, product.id);

            const result = await supertest(web)
                .post("/api/v1/wishlist")
                .set('Authorization', token)
                .send({
                    productId: product.id
                });

            loggerApp.info(result.body);

            expect(result.status).toBe(400);
            expect(result.body.errors).toBeDefined();
        });

        it('should reject if product not found', async () => {
            const invalidProductId = 'invalid-product-id';

            const result = await supertest(web)
                .post("/api/v1/wishlist")
                .set('Authorization', token)
                .send({
                    productId: invalidProductId
                });

            loggerApp.info(result.body);

            expect(result.status).toBe(404);
            expect(result.body.errors).toBeDefined();
        });

        it('should reject if request invalid', async () => {
            const result = await supertest(web)
                .post("/api/v1/wishlist")
                .set('Authorization', token)
                .send({
                    productId: ""
                });

            loggerApp.info(result.body);

            expect(result.status).toBe(400);
            expect(result.body.errors).toBeDefined();
        });
    });

    describe('DELETE /api/v1/wishlist/:productId', () => {
        it('should can remove product from wishlist', async () => {
            await createTestWishlist(user.id, product.id);

            const result = await supertest(web)
                .delete(`/api/v1/wishlist/${product.id}`)
                .set('Authorization', token);
            
            loggerApp.info(result.body);

            expect(result.status).toBe(200);
            expect(result.body.data).toBeDefined();
        });

        it('should reject if product not in wishlist', async () => {
            const result = await supertest(web)
                .delete(`/api/v1/wishlist/${product.id}`)
                .set('Authorization', token);
            
            loggerApp.info(result.body);

            expect(result.status).toBe(404);
            expect(result.body.errors).toBeDefined();
        });

        it('should reject if product id invalid', async () => {
            const result = await supertest(web)
                .delete('/api/v1/wishlist/invalid-product-id')
                .set('Authorization', token);
            
            loggerApp.info(result.body);

            expect(result.status).toBe(400);
            expect(result.body.errors).toBeDefined();
        });
    });

    describe('GET /api/v1/wishlists', () => {
        it('should can get user wishlist', async () => {
            await createTestWishlist(user.id, product.id);

            const result = await supertest(web)
                .get("/api/v1/wishlists")
                .set('Authorization', token);

            loggerApp.info(result.body);

            expect(result.status).toBe(200);
            expect(result.body.data).toBeDefined();
            expect(result.body.data.length).toBe(1);
            expect(result.body.data[0].id).toBe(product.id);
        });

        it('should return empty array if no wishlist', async () => {
            const result = await supertest(web)
                .get("/api/v1/wishlists")
                .set('Authorization', token);
            
            loggerApp.info(result.body);

            expect(result.status).toBe(200);
            expect(result.body.data).toBeDefined();
            expect(result.body.data.length).toBe(0);
        });
    });

    describe('GET /api/v1/wishlist/check/:productId', () => {
        it('should return true if product in wishlist', async () => {
            await createTestWishlist(user.id, product.id);

            const result = await supertest(web)
                .get(`/api/v1/wishlist/check/${product.id}`)
                .set('Authorization', token);

            loggerApp.info(result.body);

            expect(result.status).toBe(200);
            expect(result.body.data).toBeDefined();
            expect(result.body.data.isInWishlist).toBe(true);
        });

        it('should return false if product not in wishlist', async () => {
            const result = await supertest(web)
                .get(`/api/v1/wishlist/check/${product.id}`)
                .set('Authorization', token);

            loggerApp.info(result.body);

            expect(result.status).toBe(200);
            expect(result.body.data).toBeDefined();
            expect(result.body.data.isInWishlist).toBe(false);
        });

        it('should reject if product id invalid', async () => {
            const result = await supertest(web)
                .get('/api/v1/wishlist/check/invalid-product-id')
                .set('Authorization', token);

            loggerApp.info(result.body);

            expect(result.status).toBe(400);
            expect(result.body.errors).toBeDefined();
        });
    });
});