import supertest from "supertest";
import { createTestUser, getTestUser, removeTestUser, createTestUserWithResetToken, removeTestUserByEmail, createGoogleTestUser, createAdminUser, createRegularUser, removeTestUsers, createLocalTestUser, createLoggedInUser, removeTestUserById} from "./user-utils.test";
import { web } from "../../src/application/web.js";
import { loggerApp } from "../../src/application/logger.js";
import { prismaClient } from "../../src/application/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";




describe('POST /api/v1/auth/register', function () {
    afterEach(async () => {
        await removeTestUser();
    });

    it('should can register new user', async () => {
        const result = await supertest(web)
            .post('/api/v1/auth/register')
            .send({
                fullName: "Test User",
                email: "test@example.com",
                phone: "081234567890",
                password: "Password123!",
                confirmPassword: "Password123!"
            });

        loggerApp.info(result.body);

        expect(result.status).toBe(200);
        expect(result.body.data.fullName).toBe("Test User");
        expect(result.body.data.email).toBe("test@example.com");
        expect(result.body.data.phone).toBe("081234567890");
        expect(result.body.data.password).toBeUndefined();
    });

    it('should reject if request is invalid', async () => {
        const result = await supertest(web)
            .post('/api/v1/auth/register')
            .send({
                fullName: "",
                email: "invalid-email",
                phone: "",
                password: "short",
                confirmPassword: "notmatch"
            });

        loggerApp.info(result.body);

        expect(result.status).toBe(400);
        expect(result.body.errors).toBeDefined();
    });

    it('should reject if email already registered', async () => {
        // Create user first
        await createTestUser();

        // Try to register with same email
        const result = await supertest(web)
            .post('/api/v1/auth/register')
            .send({
                fullName: "Test User",
                email: "test@example.com",
                phone: "081234567890",
                password: "Password123!",
                confirmPassword: "Password123!"
            });

        loggerApp.info(result.body);

        expect(result.status).toBe(400);
        expect(result.body.errors).toBeDefined();
    });

    it('should reject if password confirmation not match', async () => {
        const result = await supertest(web)
            .post('/api/v1/auth/register')
            .send({
                fullName: "Test User",
                email: "test2@example.com",
                phone: "081234567890",
                password: "Password123!",
                confirmPassword: "DifferentPassword123!"
            });

        loggerApp.info(result.body);

        expect(result.status).toBe(400);
        expect(result.body.errors).toBeDefined();
    });

});


describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => await createTestUser());
  afterEach(async () => await removeTestUser());

  // Case 1: Login sukses
  it('should login successfully with correct credentials', async () => {
    const response = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: "test@example.com",
        password: "password123"
      });

      loggerApp.info(response.body);

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeDefined();
  });

  // Case 2: Password salah
  it('should reject login with wrong password', async () => {
    const response = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: "test@example.com",
        password: "wrong_password"
      });

      loggerApp.info(response.body);

    expect(response.status).toBe(401);
    expect(response.body.errors).toBeDefined();
  });

  // Case 3: Email tidak terdaftar
  it('should reject login with unregistered email', async () => {
    const response = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: "unregistered@example.com",
        password: "password123"
      });

      loggerApp.info(response.body);

    expect(response.status).toBe(401);
    expect(response.body.errors).toBeDefined();
  });
});



describe('DELETE /api/v1/auth/logout', () => {
    let testUser;
    let authToken;

        beforeAll(async () => {
        // Bersihkan data test sebelumnya
        await prismaClient.user.deleteMany({
            where: { 
                OR: [
                    { email: 'test-logout@example.com' },
                    { id: '123e4567-e89b-12d3-a456-426614174000' }
                ]
            }
        });

        // Buat user baru dengan email unik
        testUser = await prismaClient.user.create({
            data: {
                id: '123e4567-e89b-12d3-a456-426614174000', // UUID valid
                fullName: 'Test Logout User',
                email: 'test-logout@example.com', // Email unik
                password: await bcrypt.hash('Password123!', 10),
                provider: 'LOCAL',
                isVerified: true,
                token: jwt.sign(
                    { id: '123e4567-e89b-12d3-a456-426614174000' },
                    process.env.JWT_SECRET
                )
            }
        });
        authToken = testUser.token;
    });

    afterAll(async () => {
        // Cleanup
        await prismaClient.user.deleteMany({
            where: { 
                OR: [
                    { email: 'test-logout@example.com' },
                    { id: '123e4567-e89b-12d3-a456-426614174000' }
                ]
            }
        });
    });




    it('should logout successfully with valid token', async () => {
        const result = await supertest(web)
            .delete('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${authToken}`);

        loggerApp.info('Logout Response:', result.body);

        // Assertions
        expect(result.status).toBe(200);
        expect(result.body.data).toEqual({
            id: '123e4567-e89b-12d3-a456-426614174000',
            message: 'Logout successful'
        });

        // Verify token is cleared in database
        const userAfterLogout = await prismaClient.user.findUnique({
            where: { id: testUser.id }
        });
        expect(userAfterLogout.token).toBeNull();
    });

    it('should reject logout with invalid token', async () => {
        const result = await supertest(web)
            .delete('/api/v1/auth/logout')
            .set('Authorization', 'Bearer invalid-token');

        loggerApp.info(result.body);

        expect(result.status).toBe(401);
        expect(result.body.errors).toBeDefined();
    });

    it('should reject logout without token', async () => {
        const result = await supertest(web)
            .delete('/api/v1/auth/logout');

        loggerApp.info(result.body);

        expect(result.status).toBe(401);
        expect(result.body.errors).toBeDefined();
    });

  
    
});



jest.mock('../../src/utils/email-sender.js', () => ({
    sendResetPasswordEmail: jest.fn().mockResolvedValue(true)
}));

describe('POST /api/v1/auth/forgot-password', () => {
    afterEach(async () => {
        await removeTestUser();
    });

    it('should send reset link for valid email', async () => {
        await createTestUser(); // Email: test@example.com

        const result = await supertest(web)
            .post('/api/v1/auth/forgot-password')
            .send({ email: "test@example.com" });

        loggerApp.info(result.body);

        expect(result.status).toBe(200);
        expect(result.body.message).toBe("Password reset link sent to email");
    });

    it('should reject for non-existent email', async () => {
        const result = await supertest(web)
            .post('/api/v1/auth/forgot-password')
            .send({ email: "nonexistent@example.com" });

        loggerApp.info(result.body);

        expect(result.status).toBe(404);
        expect(result.body.errors).toBeDefined();
    });

    it('should reject for non-LOCAL provider', async () => {
        // Buat user dengan provider Google
        await prismaClient.user.create({
            data: {
                id: "google-user-id",
                email: "google@example.com",
                password: await bcrypt.hash("password123", 10),
                provider: 'GOOGLE',
                isVerified: true
            }
        });

        const result = await supertest(web)
            .post('/api/v1/auth/forgot-password')
            .send({ email: "google@example.com" });

        loggerApp.info(result.body);

        expect(result.status).toBe(404);

        // Cleanup
        await removeTestUserByEmail("google@example.com");
    });
});

describe('POST /api/v1/auth/reset-password', () => {
    let testUser;

    beforeEach(async () => {
        testUser = await createTestUserWithResetToken();
    });

    afterEach(async () => {
        await removeTestUserByEmail("reset@example.com");
    });

    it('should reset password with valid token', async () => {
        const result = await supertest(web)
            .post('/api/v1/auth/reset-password')
            .send({
                token: "valid-reset-token",
                password: "NewPassword123!",
                confirmPassword: "NewPassword123!"
            });

        loggerApp.info(result.body);

        expect(result.status).toBe(200);
        expect(result.body.message).toBe("Password reset successful");
    });

    it('should reject for invalid token', async () => {
        const result = await supertest(web)
            .post('/api/v1/auth/reset-password')
            .send({
                token: "invalid-token",
                password: "NewPassword123!",
                confirmPassword: "NewPassword123!"
            });

        loggerApp.info(result.body);

        expect(result.status).toBe(400);
        expect(result.body.errors).toBeDefined();
    });

    it('should reject when passwords dont match', async () => {
        const result = await supertest(web)
            .post('/api/v1/auth/reset-password')
            .send({
                token: "valid-reset-token",
                password: "NewPassword123!",
                confirmPassword: "DifferentPassword123!"
            });

        loggerApp.info(result.body);

        expect(result.status).toBe(400);
        expect(result.body.errors).toBeDefined();
    });
});


jest.mock('../../src/utils/google-oauth.js', () => ({
    verifyGoogleToken: jest.fn().mockImplementation((token) => {
        if (token === 'valid-google-token') {
            return Promise.resolve({
                name: "Google User",
                email: "google@example.com",
                picture: "https://google-avatar.jpg"
            });
        }
        if (token === 'new-user-token') {
            return Promise.resolve({
                name: "New Google User",
                email: "new@example.com",
                picture: "https://new-avatar.jpg"
            });
        }
        throw new Error('Invalid Google token');
    })
}));

describe('POST /api/v1/auth/google', () => {
    afterEach(async () => {
        await removeTestUserByEmail("google@example.com");
        await removeTestUserByEmail("new@example.com");
        await removeTestUserByEmail("local@example.com");
    });

    it('should login existing Google user', async () => {
        // Buat user Google terlebih dahulu
        await createGoogleTestUser();

        const result = await supertest(web)
            .post('/api/v1/auth/google')
            .send({ access_token: "valid-google-token" });

        loggerApp.info(result.body);

        expect(result.status).toBe(200);
        expect(result.body.data.email).toBe("google@example.com");
        expect(result.body.data.provider).toBe("GOOGLE");
        expect(result.body.data.token).toBeDefined();
    });

    it('should register new Google user', async () => {
        const result = await supertest(web)
            .post('/api/v1/auth/google')
            .send({ access_token: "new-user-token" });

        loggerApp.info(result.body);

        expect(result.status).toBe(200);
        expect(result.body.data.email).toBe("new@example.com");
        expect(result.body.data.fullName).toBe("New Google User");
        expect(result.body.data.provider).toBe("GOOGLE");
        expect(result.body.data.token).toBeDefined();
    });

    it('should reject invalid Google token', async () => {
        const result = await supertest(web)
            .post('/api/v1/auth/google')
            .send({ access_token: "invalid-token" });

        loggerApp.info(result.body);

        expect(result.status).toBe(401);
        expect(result.body.errors).toBeDefined();
    });


it('should reject if email registered with other provider', async () => {
    // 1. Buat user dengan provider LOCAL
    await prismaClient.user.create({
        data: {
            id: "local-test-id",
            fullName: "Local User",
            email: "local@example.com",
            provider: 'LOCAL',
            isVerified: true
        }
    });

    // 2. Mock Google token verification
    jest.spyOn(require('../../src/utils/google-oauth.js'), 'verifyGoogleToken')
        .mockResolvedValueOnce({
            name: "Google User",
            email: "local@example.com", // Email yang sudah terdaftar dengan LOCAL
            picture: "https://google-avatar.jpg"
        });

    // 3. Eksekusi request
    const result = await supertest(web)
        .post('/api/v1/auth/google')
        .send({ access_token: "valid-token" });

    loggerApp.info('Conflict Response:', result.body);

    // 4. Assertions sesuai dengan struktur response aktual
    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
    // expect(result.body).toEqual({
    //     errors: {
    //         code: 401,
    //         message: "Email already registered with LOCAL provider"
    //     }
    // });
});


});



describe('GET /api/v1/admin/users', () => {
    let adminToken;
    let regularToken;

    beforeAll(async () => {
        // Buat user admin dan regular
        const admin = await createAdminUser();
        const regularUser = await createRegularUser();

        // Generate token
        adminToken = jwt.sign(
            { id: admin.id, email: admin.email, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        regularToken = jwt.sign(
            { id: regularUser.id, email: regularUser.email, role: regularUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Update token di database
        await prismaClient.user.update({
            where: { id: admin.id },
            data: { token: adminToken }
        });
        
        await prismaClient.user.update({
            where: { id: regularUser.id },
            data: { token: regularToken }
        });
    });

    afterAll(async () => {
        await removeTestUsers();
    });

    it('should get all USERs for ADMIN', async () => {
        const result = await supertest(web)
            .get('/api/v1/admin/users')
            .set('Authorization', `Bearer ${adminToken}`);

        loggerApp.info(result.body);

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(Array.isArray(result.body.data)).toBe(true);
        
        // Pastikan hanya user dengan role USER yang diambil
        result.body.data.forEach(user => {
            expect(user.role).toBe('USER');
        });
    });

    it('should reject if not authenticated', async () => {
        const result = await supertest(web)
            .get('/api/v1/admin/users')
            .set('Authorization', 'Bearer invalid-token');

        loggerApp.info(result.body);

        expect(result.status).toBe(401);
        expect(result.body.errors).toBeDefined();
    });

    it('should reject if not ADMIN role', async () => {
        const result = await supertest(web)
            .get('/api/v1/admin/users')
            .set('Authorization', `Bearer ${regularToken}`);

        loggerApp.info(result.body);

        expect(result.status).toBe(403);
        expect(result.body.errors).toBeDefined();
    });


it('should handle database error with next(error)', async () => {
    // Simpan reference ke fungsi findMany asli
    const originalFindMany = prismaClient.user.findMany;
    
    // Ganti dengan mock yang error
    prismaClient.user.findMany = jest.fn().mockImplementation(() => {
        throw new Error('Simulated database error');
    });

    const result = await supertest(web)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

    loggerApp.info('Response Body:', result.body);

    // Assertions sesuai dengan error middleware Anda
    expect(result.status).toBe(500);
    expect(result.body.errors).toBeDefined();
    // expect(result.body.errors).toEqual();

    // Kembalikan fungsi asli
    prismaClient.user.findMany = originalFindMany;
});
});



// describe('GET /api/v1/admin/users', () => {
//     let adminToken;

//     beforeAll(async () => {
//         // Buat admin dan dapatkan token
//         const admin = await createAdminTestUser();
        
//         // Generate token untuk admin (sesuaikan dengan cara Anda generate token)
//         adminToken = jwt.sign(
//             { id: admin.id, email: admin.email, role: admin.role },
//             process.env.JWT_SECRET,
//             { expiresIn: '1h' }
//         );

//         // Update token di database
//         await prismaClient.user.update({
//             where: { id: admin.id },
//             data: { token: adminToken }
//         });
//     });

//     beforeEach(async () => {
//         await createMultipleTestUsers();
//     });

//     afterAll(async () => {
//         await removeAllTestUsers();
//     });

//     it('should get all USERs for ADMIN', async () => {
//         const result = await supertest(web)
//             .get('/api/v1/admin/users')
//             .set('Authorization', `Bearer ${adminToken}`);

//         loggerApp.info(result.body);

//         expect(result.status).toBe(200);
//         expect(result.body.success).toBe(true);
//         expect(result.body.data).toHaveLength(3); // 3 user biasa
        
//         // Verifikasi hanya role USER yang diambil
//         result.body.data.forEach(user => {
//             expect(user.role).toBe('USER');
//         });
        
//         // Verifikasi sorting by createdAt desc
//         const dates = result.body.data.map(u => new Date(u.createdAt).getTime());
//         expect(dates).toEqual(dates.sort((a, b) => b - a));
//     });

//     it('should reject if not authenticated', async () => {
//         const result = await supertest(web)
//             .get('/api/v1/admin/users')
//             .set('Authorization', 'Bearer invalid-token');

//         loggerApp.info(result.body);

//         expect(result.status).toBe(401);
//         expect(result.body.errors).toBeDefined();
//     });

//     it('should reject if not ADMIN role', async () => {
//         // Buat user biasa dan dapatkan token
//         const regularUser = await prismaClient.user.create({
//             data: {
//                 id: "regular-user-id",
//                 fullName: "Regular User",
//                 email: "regular@example.com",
//                 provider: 'LOCAL',
//                 role: 'USER',
//                 isVerified: true
//             }
//         });
        
//         const regularToken = jwt.sign(
//             { id: regularUser.id, email: regularUser.email, role: regularUser.role },
//             process.env.JWT_SECRET,
//             { expiresIn: '1h' }
//         );

//         const result = await supertest(web)
//             .get('/api/v1/admin/users')
//             .set('Authorization', `Bearer ${regularToken}`);

//         loggerApp.info(result.body);

//         expect(result.status).toBe(403); // Forbidden
//         expect(result.body.errors).toBeDefined();

//         // Cleanup
//         await prismaClient.user.delete({ where: { id: regularUser.id } });
//     });
// });