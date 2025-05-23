import supertest from "supertest";
import { web } from "../src/application/web.js";
import { loggerApp } from "../src/application/logger.js";
import { createTestUser, createTestAdmin, removeTestUser, removeTestAdmin } from "./user/user-utils.test.js";
import userService from "../src/service/user-service.js";
import { ResponseError } from "../src/error/response-error.js";
import { prismaClient } from "../src/application/database.js";

describe('GET /api/v1/admin/users', function () {
  let adminToken;
  let regularUserToken;

  beforeAll(async () => {
    // Create test admin and regular user
    await createTestAdmin();
    await createTestUser();
    
    // Login as admin to get token
    const adminLogin = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'admin123'
      });
    adminToken = adminLogin.body.data.token;

    // Login as regular user to get token
    const userLogin = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: 'farhanwundari01@gmail.com',
        password: 'password123'
      });
    regularUserToken = userLogin.body.data.token;
  });

  afterAll(async () => {
    await removeTestUser();
    await removeTestAdmin();
  });

  describe('Service Layer - getAllUsersForAdmin', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return all users with USER role', async () => {
      // Mock Prisma response
      const mockUsers = [
        {
          id: 'user-1',
          fullName: 'User One',
          email: 'user1@example.com',
          role: 'USER',
          createdAt: new Date()
        },
        {
          id: 'user-2',
          fullName: 'User Two',
          email: 'user2@example.com',
          role: 'USER',
          createdAt: new Date()
        }
      ];

      prismaClient.user.findMany = jest.fn().mockResolvedValue(mockUsers);

      const result = await userService.getAllUsersForAdmin();

      expect(prismaClient.user.findMany).toHaveBeenCalledWith({
        where: { role: 'USER' },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          avatar: true,
          provider: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no users found', async () => {
      prismaClient.user.findMany = jest.fn().mockResolvedValue([]);

      const result = await userService.getAllUsersForAdmin();

      expect(result).toEqual([]);
    });

    it('should throw error when database operation fails', async () => {
      const mockError = new Error('Database connection failed');
      prismaClient.user.findMany = jest.fn().mockRejectedValue(mockError);

      await expect(userService.getAllUsersForAdmin()).rejects.toThrow(mockError);
    });
  });

  describe('API Endpoint - GET /api/v1/admin/users', () => {
    it('should return 200 with users data for admin', async () => {
      const response = await supertest(web)
        .get('/api/v1/admin/users')
        .set('Authorization', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      // Verify it only returns USER role (not ADMIN)
      if (response.body.data.length > 0) {
        expect(response.body.data[0].role).toBe('USER');
      }
    });

    it('should return 403 for non-admin users', async () => {
      const response = await supertest(web)
        .get('/api/v1/admin/users')
        .set('Authorization', regularUserToken);

      expect(response.status).toBe(403);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await supertest(web)
        .get('/api/v1/admin/users');

      expect(response.status).toBe(401);
    });

    it('should handle service errors properly', async () => {
      // Mock the service to throw an error
      const originalGetAll = userService.getAllUsersForAdmin;
      userService.getAllUsersForAdmin = jest.fn()
        .mockRejectedValue(new ResponseError(500, 'Internal Server Error'));

      const response = await supertest(web)
        .get('/api/v1/admin/users')
        .set('Authorization', adminToken);

      expect(response.status).toBe(500);
      expect(response.body.errors.message).toBe('Internal Server Error');

      // Restore original implementation
      userService.getAllUsersForAdmin = originalGetAll;
    });
  });
});