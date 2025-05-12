import supertest from "supertest";
import { web } from "../src/application/web.js";
import { prismaClient } from "../src/application/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// import { 
//   createTestUser, 
//   removeTestUser, 
//   getTestUser,
//   createTestAdmin,
//   removeTestAdmin
// } from "./test-util.js";
import { loggerApp } from "../src/application/logger.js";
import { createTestAdmin, createTestUser, getTestUser, removeTestAdmin, removeTestUser } from "./test-utils.test.js";

describe('POST /api/v1/auth/register', function () {
  afterEach(async () => {
    await removeTestUser();
  });

  it('should can register new user', async () => {
    const result = await supertest(web)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'test',
        email: 'test@example.com',
        phone: '08123456789',
        password: 'password123'
      });

    expect(result.status).toBe(200);
    expect(result.body.data.id).toBeDefined();
    expect(result.body.data.fullName).toBe('test');
    expect(result.body.data.email).toBe('test@example.com');
    expect(result.body.data.password).toBeUndefined();
  });

  it('should reject if email already registered', async () => {
    await createTestUser();

    const result = await supertest(web)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'test',
        email: 'test@example.com', // same as created user
        phone: '08123456789',
        password: 'password123'
      });

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });

  it('should reject if request is invalid', async () => {
    const result = await supertest(web)
      .post('/api/v1/auth/register')
      .send({
        fullName: '',
        email: 'invalid',
        phone: '',
        password: ''
      });

    loggerApp.info(result.body);
    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });
});

describe('POST /api/v1/auth/login', function () {
  beforeEach(async () => {
    await createTestUser();
  });

  afterEach(async () => {
    await removeTestUser();
  });

  it('should can login with valid credentials', async () => {
    const result = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    loggerApp.info(result.body);

    expect(result.status).toBe(200);
    expect(result.body.data.token).toBeDefined();
    expect(result.body.data.fullName).toBe('test');
    expect(result.body.data.email).toBe('test@example.com');
  });

  it('should reject login with wrong password', async () => {
    const result = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

    loggerApp.info(result.body);
    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  });

  it('should reject login with unregistered email', async () => {
    const result = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: 'notfound@example.com',
        password: 'password123'
      });

    loggerApp.info(result.body);
    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  });

  it('should reject if request is invalid', async () => {
    const result = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: '',
        password: ''
      });

    loggerApp.info(result.body);
    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
  });
});

describe('POST /api/v1/auth/login-admin', function () {
  beforeEach(async () => {
    await createTestAdmin();
  });

  afterEach(async () => {
    await removeTestAdmin();
  });

  it('should can login admin with valid credentials', async () => {
    const result = await supertest(web)
      .post('/api/v1/auth/login-admin')
      .send({
        email: 'admin@example.com',
        password: 'admin123'
      });

    loggerApp.info(result.body);

    expect(result.status).toBe(200);
    expect(result.body.data.token).toBeDefined();
    expect(result.body.data.role).toBe('ADMIN');
  });

  it('should reject non-admin user', async () => {
    await createTestUser();

    const result = await supertest(web)
      .post('/api/v1/auth/login-admin')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    loggerApp.info(result.body);
    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  });
});

describe('DELETE /api/v1/auth/logout', function () {
  beforeEach(async () => {
    await createTestUser();
  });

  afterEach(async () => {
    await removeTestUser();
  });

  it('should can logout', async () => {
    // First login to get token
    const loginResponse = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    const token = loginResponse.body.data.token;

    // Then logout
    const result = await supertest(web)
      .delete('/api/v1/auth/logout')
      .set('Authorization', token);

    expect(result.status).toBe(200);
    expect(result.body.data.message).toBe("Logout successful");

    // Verify token is cleared in database
    const user = await getTestUser();
    expect(user.token).toBeNull();
  });

  it('should reject logout with invalid token', async () => {
    const result = await supertest(web)
      .delete('/api/v1/auth/logout')
      .set('Authorization', 'invalidtoken');

    expect(result.status).toBe(401);
  });
});

describe('POST /api/v1/auth/forgot-password', function () {
  beforeEach(async () => {
    await createTestUser();
  });

  afterEach(async () => {
    await removeTestUser();
  });

  it('should send reset password email for valid user', async () => {
    const result = await supertest(web)
      .post('/api/v1/auth/forgot-password')
      .send({
        email: 'test@example.com'
      });

    expect(result.status).toBe(200);
    // Note: In a real test, you might want to mock the email service
  });

  it('should reject for non-existent email', async () => {
    const result = await supertest(web)
      .post('/api/v1/auth/forgot-password')
      .send({
        email: 'notfound@example.com'
      });

    expect(result.status).toBe(404);
  });
});

describe('POST /api/v1/auth/reset-password', function () {
  beforeEach(async () => {
    await createTestUser();
    // In a real test, you'd set up a reset token here
  });

  afterEach(async () => {
    await removeTestUser();
  });

  it('should reset password with valid token', async () => {
    // This is a simplified test - in reality you'd need to:
    // 1. Generate a real reset token
    // 2. Hash it and store in DB with expiration
    // 3. Then test the reset
    
    const testToken = "valid-reset-token";
    const newPassword = "newpassword123";

    const result = await supertest(web)
      .post('/api/v1/auth/reset-password')
      .send({
        token: testToken,
        password: newPassword,
        confirmPassword: newPassword
      });

    expect(result.status).toBe(200);
  });

  it('should reject with mismatched passwords', async () => {
    const result = await supertest(web)
      .post('/api/v1/auth/reset-password')
      .send({
        token: "any-token",
        password: "newpassword123",
        confirmPassword: "differentpassword"
      });

    expect(result.status).toBe(400);
  });

  it('should reject with invalid/expired token', async () => {
    const result = await supertest(web)
      .post('/api/v1/auth/reset-password')
      .send({
        token: "invalid-token",
        password: "newpassword123",
        confirmPassword: "newpassword123"
      });

    expect(result.status).toBe(400);
  });
});

describe('GET /api/v1/admin/users', function () {
  beforeEach(async () => {
    await createTestAdmin();
    await createTestUser();
  });

  afterEach(async () => {
    await removeTestUser();
    await removeTestAdmin();
  });

  it('should get all users for admin', async () => {
    // First login as admin
    const loginResponse = await supertest(web)
      .post('/api/v1/auth/login-admin')
      .send({
        email: 'admin@example.com',
        password: 'admin123'
      });

    const token = loginResponse.body.data.token;

    const result = await supertest(web)
      .get('/api/v1/admin/users')
      .set('Authorization', token);

    expect(result.status).toBe(200);
    expect(Array.isArray(result.body.data)).toBe(true);
    expect(result.body.data.length).toBeGreaterThan(0);
  });

  it('should reject for non-admin users', async () => {
    // Login as regular user
    const loginResponse = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    const token = loginResponse.body.data.token;

    const result = await supertest(web)
      .get('/api/v1/admin/users')
      .set('Authorization', token);

    expect(result.status).toBe(403);
  });
});

describe('DELETE /api/v1/admin/users/:id', function () {
  beforeEach(async () => {
    await createTestAdmin();
    await createTestUser();
  });

  afterEach(async () => {
    await removeTestAdmin();
    // User will be deleted by the test
  });

  it('should delete user by admin', async () => {
    // Login as admin
    const loginResponse = await supertest(web)
      .post('/api/v1/auth/login-admin')
      .send({
        email: 'admin@example.com',
        password: 'admin123'
      });

    const token = loginResponse.body.data.token;
    const userToDelete = await getTestUser();

    const result = await supertest(web)
      .delete(`/api/v1/admin/users/${userToDelete.id}`)
      .set('Authorization', token);

    expect(result.status).toBe(200);
    expect(result.body.data.message).toContain("deleted successfully");
  });

  it('should reject if user not found', async () => {
    const loginResponse = await supertest(web)
      .post('/api/v1/auth/login-admin')
      .send({
        email: 'admin@example.com',
        password: 'admin123'
      });

    const token = loginResponse.body.data.token;
    const fakeUserId = "123e4567-e89b-12d3-a456-426614174000"; // Random UUID

    const result = await supertest(web)
      .delete(`/api/v1/admin/users/${fakeUserId}`)
      .set('Authorization', token);

    expect(result.status).toBe(404);
  });
});

