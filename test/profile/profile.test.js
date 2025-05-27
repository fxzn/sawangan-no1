import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { prismaClient } from "../../src/application/database.js";
import { loggerApp } from "../../src/application/logger.js";
import bcrypt from "bcrypt";
import fs from 'fs';
import path from 'path';
import { cloudinary } from "../../src/middleware/cloudinary-middleware.js";

describe('GET /api/v1/profile', () => {
    let token, userId;

    beforeAll(async () => {
        // Cleanup if exists
        await prismaClient.user.deleteMany({
            where: { email: 'test1@example.com' }
        });

        const user = await prismaClient.user.create({
            data: {
                fullName: 'Test User2',
                email: 'test2@example.com',
                password: await bcrypt.hash('rahasia', 10),
                phone: '08123456789',
                avatar: 'https://example.com/avatar.jpg',
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        userId = user.id;

        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: user.email, password: 'rahasia' });

        token = loginRes.body.data.token;
    });

    afterAll(async () => {
        await prismaClient.user.deleteMany({
            where: { email: 'test2@example.com' }
        });
    });

    it('should get profile with valid token including avatar', async () => {
        const res = await supertest(web)
            .get('/api/v1/profile')
            .set('Authorization', `Bearer ${token}`);

        loggerApp.info(res.body);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({
            id: userId,
            fullName: 'Test User2',
            email: 'test2@example.com',
            phone: '08123456789',
            avatar: 'https://example.com/avatar.jpg',
            role: 'USER'
        });
    });

    it('should return null avatar if not set', async () => {
        const uniqueEmail = `noavatar-${Date.now()}@example.com`;

        const noAvatarUser = await prismaClient.user.create({
            data: {
                fullName: 'No Avatar User',
                email: uniqueEmail,
                password: await bcrypt.hash("rahasia", 10),
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        try {
            const loginRes = await supertest(web)
                .post('/api/v1/auth/login')
                .send({ email: uniqueEmail, password: "rahasia" });

            const noAvatarToken = loginRes.body.data.token;

            const res = await supertest(web)
                .get('/api/v1/profile')
                .set('Authorization', `Bearer ${noAvatarToken}`);

            loggerApp.info(res.body);

            expect(res.status).toBe(200);
            expect(res.body.data.avatar).toBeNull();
        } finally {
            await prismaClient.user.delete({ where: { id: noAvatarUser.id } });
        }
    });

    it('should reject get profile with invalid token', async () => {
        const res = await supertest(web)
            .get('/api/v1/profile')
            .set('Authorization', 'Bearer invalid-token');

        loggerApp.info(res.body);

        expect(res.status).toBe(401);
        expect(res.body.errors).toBeDefined();
    });
});

describe('PATCH /api/v1/profile', () => {
    let token;
    let user;

    beforeAll(async () => {
        await prismaClient.user.deleteMany({
            where: { email: 'test2@example.com' }
        });

        user = await prismaClient.user.create({
            data: {
                fullName: 'User Test2',
                email: 'test2@example.com',
                phone: '08123456789',
                password: await bcrypt.hash('rahasia', 10),
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: user.email, password: 'rahasia' });

        token = loginRes.body.data.token;
    });

    afterAll(async () => {
        await prismaClient.user.delete({ where: { id: user.id } });
    });

    it('should update profile', async () => {
        const updateData = {
            fullName: 'Updated Name',
            phone: '08987654321'
        };

        const res = await supertest(web)
            .patch('/api/v1/profile')
            .set('Authorization', `Bearer ${token}`)
            .send(updateData);

        loggerApp.info(res.body);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.fullName).toBe(updateData.fullName);
        expect(res.body.data.phone).toBe(updateData.phone);
        expect(res.body.data.email).toBe(user.email);
    });

    it('should reject if request is invalid', async () => {
        const invalidData = {
            fullName: '',
            phone: '123'
        };

        const res = await supertest(web)
            .patch('/api/v1/profile')
            .set('Authorization', `Bearer ${token}`)
            .send(invalidData);

        loggerApp.info(res.body);

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });

    it('should reject if unauthorized', async () => {
        const updateData = {
            fullName: 'Updated Name',
            phone: '08987654321'
        };

        const res = await supertest(web)
            .patch('/api/v1/profile')
            .send(updateData); // no token

        expect(res.status).toBe(401);
        expect(res.body.errors).toBeDefined();
    });
});



describe('POST /api/v1/profile/avatar', () => {
    let token;
    let user;

    beforeAll(async () => {
        await prismaClient.user.deleteMany({
            where: { email: 'avatar-test@example.com' }
        });

        user = await prismaClient.user.create({
            data: {
                fullName: 'Avatar Test User',
                email: 'avatar-test@example.com',
                password: await bcrypt.hash('rahasia', 10),
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: user.email, password: 'rahasia' });

        token = loginRes.body.data.token;
    });

    afterAll(async () => {
        const testUser = await prismaClient.user.findUnique({
            where: { id: user.id }
        });

        if (testUser && testUser.avatar) {
            const publicId = testUser.avatar.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`user_avatars/${publicId}`);
        }

        await prismaClient.user.delete({
            where: { id: user.id }
        });
    });

    it('should upload valid avatar image successfully', async () => {
        const testImagePath = path.join(__dirname, 'test-avatar.jpg');
        expect(fs.existsSync(testImagePath)).toBe(true);

        const res = await supertest(web)
            .post('/api/v1/profile/avatar')
            .set('Authorization', `Bearer ${token}`)
            .attach('avatar', testImagePath);

        loggerApp.info(res.body);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.avatarUrl).toMatch(/^https?:\/\//);
    });

    it('should fail if no avatar file provided', async () => {
        const res = await supertest(web)
            .post('/api/v1/profile/avatar')
            .set('Authorization', `Bearer ${token}`);

        loggerApp.info(res.body);

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });

    it('should reject non-image file (wrong format)', async () => {
        const testTextPath = path.join(__dirname, 'test-file.txt');
        expect(fs.existsSync(testTextPath)).toBe(true);

        const res = await supertest(web)
            .post('/api/v1/profile/avatar')
            .set('Authorization', `Bearer ${token}`)
            .attach('avatar', testTextPath);

        loggerApp.info(res.body);

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });

    it('should reject if unauthorized', async () => {
        const testImagePath = path.join(__dirname, 'test-avatar.jpg');

        const res = await supertest(web)
            .post('/api/v1/profile/avatar')
            .attach('avatar', testImagePath); // no token

        loggerApp.info(res.body);

        expect(res.status).toBe(401);
        expect(res.body.errors).toBeDefined();
    });

    it('should handle service error if user not found', async () => {
        const testImagePath = path.join(__dirname, 'test-avatar.jpg');

        const fakeUser = await prismaClient.user.create({
            data: {
                fullName: 'Fake User',
                email: `fake-${Date.now()}@example.com`,
                password: await bcrypt.hash('rahasia', 10),
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: fakeUser.email, password: 'rahasia' });

        const fakeToken = loginRes.body.data.token;

        // Delete user from DB
        await prismaClient.user.delete({ where: { id: fakeUser.id } });

        const res = await supertest(web)
            .post('/api/v1/profile/avatar')
            .set('Authorization', `Bearer ${fakeToken}`)
            .attach('avatar', testImagePath);

        loggerApp.info(res.body);

        expect(res.status).toBe(401); // karena token invalid setelah user hilang
        expect(res.body.errors).toBeDefined();
    });

    it('should delete old avatar from Cloudinary when uploading new one', async () => {
        const testImage1 = path.join(__dirname, 'test-avatar1.jpg');
        const testImage2 = path.join(__dirname, 'test-avatar2.jpg');

        expect(fs.existsSync(testImage1)).toBe(true);
        expect(fs.existsSync(testImage2)).toBe(true);

        // Upload first avatar
        const res1 = await supertest(web)
            .post('/api/v1/profile/avatar')
            .set('Authorization', `Bearer ${token}`)
            .attach('avatar', testImage1);

        expect(res1.status).toBe(200);
        const firstAvatarUrl = res1.body.data.avatarUrl;
        expect(firstAvatarUrl).toMatch(/^https?:\/\//);

        // Upload second avatar
        const res2 = await supertest(web)
            .post('/api/v1/profile/avatar')
            .set('Authorization', `Bearer ${token}`)
            .attach('avatar', testImage2);

        expect(res2.status).toBe(200);
        const secondAvatarUrl = res2.body.data.avatarUrl;
        expect(secondAvatarUrl).toMatch(/^https?:\/\//);

        expect(secondAvatarUrl).not.toBe(firstAvatarUrl);

        const oldPublicId = firstAvatarUrl.split('/').pop().split('.')[0];

        let isDeleted = false;
        try {
            await cloudinary.api.resource(`user_avatars/${oldPublicId}`);
            isDeleted = false; // jika ditemukan, berarti belum terhapus → salah
        } catch (err) {
            if (
                err?.error?.http_code === 404 ||
                (typeof err?.error?.message === 'string' && err.error.message.includes('Resource not found'))
            ) {
                isDeleted = true; // kalau 404, berarti sudah terhapus → benar
            } else {
                throw err; // error lain, lempar ke atas supaya tes gagal
            }
        }

expect(isDeleted).toBe(true);

    });
});


describe('PATCH /api/v1/profile/changepassword', () => {
    let token;
    let user;

    beforeAll(async () => {
        await prismaClient.user.deleteMany({
            where: { email: 'changepass-test@example.com' }
        });

        user = await prismaClient.user.create({
            data: {
                fullName: 'ChangePass Test User',
                email: 'changepass-test@example.com',
                password: await bcrypt.hash('oldpassword', 10),
                role: 'USER',
                provider: 'LOCAL',
                isVerified: true
            }
        });

        const loginRes = await supertest(web)
            .post('/api/v1/auth/login')
            .send({ email: user.email, password: 'oldpassword' });

        token = loginRes.body.data.token;
    });

    afterAll(async () => {
        await prismaClient.user.delete({ where: { id: user.id } });
    });

    it('should change password successfully', async () => {
        const res = await supertest(web)
            .patch('/api/v1/profile/changepassword')
            .set('Authorization', `Bearer ${token}`)
            .send({
                currentPassword: 'oldpassword',
                newPassword: 'newpassword123',
                confirmPassword: 'newpassword123'
            });

        loggerApp.info(res.body);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Password updated');

        // Verify password updated in database
        const updatedUser = await prismaClient.user.findUnique({ where: { id: user.id } });
        const isUpdated = await bcrypt.compare('newpassword123', updatedUser.password);
        expect(isUpdated).toBe(true);
    });

    it('should fail if current password is wrong', async () => {
        const res = await supertest(web)
            .patch('/api/v1/profile/changepassword')
            .set('Authorization', `Bearer ${token}`)
            .send({
                currentPassword: 'wrongpassword',
                newPassword: 'anothernewpass',
                confirmPassword: 'anothernewpass'
            });

        loggerApp.info(res.body);

        expect(res.status).toBe(401);
        expect(res.body.errors).toBeDefined();
    });

    it('should fail if new password and confirm do not match', async () => {
        const res = await supertest(web)
            .patch('/api/v1/profile/changepassword')
            .set('Authorization', `Bearer ${token}`)
            .send({
                currentPassword: 'newpassword123',
                newPassword: 'pass1',
                confirmPassword: 'pass2'
            });

        loggerApp.info(res.body);

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });
});