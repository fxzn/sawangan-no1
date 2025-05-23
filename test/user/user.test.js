import supertest from "supertest";
import { web } from "../../src/application/web.js";
import { loggerApp } from "../../src/application/logger.js";
import { createGoogleUser, createTestAdmin, createTestUser, getTestUser, removeGoogleUser, removeTestAdmin, removeTestUser } from "./user-utils.test.js";
import userService from "../../src/service/user-service.js";
import { ResponseError } from "../../src/error/response-error.js";
import { prismaClient } from "../../src/application/database.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import * as emailSender from "../../src/utils/email-sender.js";
import * as tokenUtils from "../../src/utils/token-utils.js";
import * as googleOAuth from "../../src/utils/google-oauth.js";

describe('POST /api/v1/auth/register', function () {
  afterEach(async () => {
    await removeTestUser();
  });

  it('should can register new user', async () => {
    const result = await supertest(web)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'test',
        email: 'farhanwundari01@gmail.com',
        phone: '08123456789',
        password: 'password123',
        confirmPassword: 'password123'
      });
      loggerApp.info(result.body);

    expect(result.status).toBe(201);
    expect(result.body.data.id).toBeDefined();
    expect(result.body.data.fullName).toBe('test');
    expect(result.body.data.email).toBe('farhanwundari01@gmail.com');
    expect(result.body.data.password).toBeUndefined();
    expect(result.body.data.confirmPassword).toBeUndefined();
  });

  it('should reject if email already registered', async () => {
    await createTestUser();

    const result = await supertest(web)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'test',
        email: 'farhanwundari01@gmail.com', 
        phone: '08123456789',
        password: 'password123',
        confirmPassword: 'password123'
      });

    expect(result.status).toBe(400);
    expect(result.body.errors).toBeDefined();
    expect(result.body.errors.message).toBe("Email already exists");
    
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
        email: 'farhanwundari01@gmail.com',
        password: 'password123'
      });

    loggerApp.info(result.body);

    expect(result.status).toBe(200);
    expect(result.body.data.token).toBeDefined();
    expect(result.body.data.fullName).toBe('test');
    expect(result.body.data.email).toBe('farhanwundari01@gmail.com');
  });

  it('should reject login with wrong password', async () => {
    const result = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: 'farhanwundari01@gmail.com',
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

  it('should reject login for user with non-local provider', async () => {
    await createGoogleUser(); // Tambahkan user dengan provider GOOGLE

    const result = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: 'googleuser@example.com',
        password: 'password123'
      });

    loggerApp.info(result.body);

    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
    expect(result.body.errors.message).toBe("Please login using GOOGLE");

    await removeGoogleUser(); // Cleanup
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
      .post('/api/v1/auth/login')
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
        email: 'fhnw10@gmail.com',
        password: '#04November'
      });

    loggerApp.info(result.body);
    expect(result.status).toBe(401);
    expect(result.body.errors).toBeDefined();
  });
});



describe('DELETE /api/v1/auth/logout', function () {
  beforeEach(async () => {
    await removeTestUser(); 
    await createTestUser();
  });

  afterEach(async () => {
    await removeTestUser();
  });

  it('should can logout', async () => {
    const loginResponse = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: 'farhanwundari01@gmail.com',
        password: 'password123'
      });

    const token = loginResponse.body.data.token;

    const result = await supertest(web)
      .delete('/api/v1/auth/logout')
      .set('Authorization', token);

    expect(result.status).toBe(200);
    expect(result.body.data.message).toBe("Logout successful");

    const user = await getTestUser();
    expect(user.token).toBeNull();
  });

  it('should reject logout with invalid token', async () => {
    const result = await supertest(web)
      .delete('/api/v1/auth/logout')
      .set('Authorization', 'invalidtoken');

    expect(result.status).toBe(401);
  });

  it('should handle error thrown during logout', async () => {
    // Simulasikan error dari userService.logout
    const originalLogout = userService.logout;
    userService.logout = jest.fn().mockRejectedValue(
      new ResponseError(500, 'Unexpected error during logout')
    );

    const loginResponse = await supertest(web)
      .post('/api/v1/auth/login')
      .send({
        email: 'farhanwundari01@gmail.com',
        password: 'password123'
      });

    const token = loginResponse.body.data.token;

    const result = await supertest(web)
      .delete('/api/v1/auth/logout')
      .set('Authorization', token);

    expect(result.status).toBe(500);
    expect(result.body.errors).toBeDefined();
    expect(result.body.errors.message).toBe("Unexpected error during logout");

    // Kembalikan ke implementasi asli
    userService.logout = originalLogout;
  });


  
});



describe('userService.forgotPassword', () => {
  const testEmail = 'forgotuser@example.com';
  const testUser = {
    id: 'user-id-123',
    email: testEmail,
    provider: 'LOCAL'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate and store reset token for valid user', async () => {
    // Mocks
    const mockToken = 'raw-token';
    const mockHashed = 'hashed-token';

    jest.spyOn(prismaClient.user, 'findUnique').mockResolvedValue(testUser);
    jest.spyOn(tokenUtils, 'generateResetToken').mockReturnValue(mockToken);
    jest.spyOn(tokenUtils, 'hashToken').mockResolvedValue(mockHashed);
    jest.spyOn(prismaClient.user, 'update').mockResolvedValue({});
    jest.spyOn(emailSender, 'sendResetPasswordEmail').mockResolvedValue(true);

    await userService.forgotPassword(testEmail);

    expect(prismaClient.user.findUnique).toHaveBeenCalledWith({
      where: { email: testEmail, provider: 'LOCAL' }
    });

    expect(tokenUtils.generateResetToken).toHaveBeenCalled();
    expect(tokenUtils.hashToken).toHaveBeenCalledWith(mockToken);

    expect(prismaClient.user.update).toHaveBeenCalledWith({
      where: { id: testUser.id },
      data: {
        resetPasswordToken: mockHashed,
        resetPasswordExpire: expect.any(Date)
      }
    });

    expect(emailSender.sendResetPasswordEmail).toHaveBeenCalledWith(
      testEmail,
      expect.stringContaining(`reset-password?token=${mockToken}`)
    );
  });

  it('should throw 404 if user is not found', async () => {
    jest.spyOn(prismaClient.user, 'findUnique').mockResolvedValue(null);

    await expect(userService.forgotPassword('notfound@example.com'))
      .rejects.toThrow(new ResponseError(404, 'User not found'));
  });

  it('should throw if update fails', async () => {
    jest.spyOn(prismaClient.user, 'findUnique').mockResolvedValue(testUser);
    jest.spyOn(tokenUtils, 'generateResetToken').mockReturnValue('token');
    jest.spyOn(tokenUtils, 'hashToken').mockResolvedValue('hashed');
    jest.spyOn(prismaClient.user, 'update').mockRejectedValue(new Error('Update failed'));

    await expect(userService.forgotPassword(testEmail))
      .rejects.toThrow('Update failed');
  });

  it('should throw if email sending fails', async () => {
    jest.spyOn(prismaClient.user, 'findUnique').mockResolvedValue(testUser);
    jest.spyOn(tokenUtils, 'generateResetToken').mockReturnValue('token');
    jest.spyOn(tokenUtils, 'hashToken').mockResolvedValue('hashed');
    jest.spyOn(prismaClient.user, 'update').mockResolvedValue({});
    jest.spyOn(emailSender, 'sendResetPasswordEmail').mockRejectedValue(new Error('Email failed'));

    await expect(userService.forgotPassword(testEmail))
      .rejects.toThrow('Email failed');
  });
});



describe('POST /api/v1/auth/forgot-password', function () {
  beforeEach(async () => {
    await createTestUser();
  });

  afterEach(async () => {
    await removeTestUser();
    jest.clearAllMocks();
  });

  describe('Service Layer Tests', () => {
    it('should generate and store reset token for valid user', async () => {
      // Mock dependencies
      jest.spyOn(tokenUtils, 'generateResetToken').mockReturnValue('test-token');
      jest.spyOn(tokenUtils, 'hashToken').mockResolvedValue('hashed-token');
      jest.spyOn(emailSender, 'sendResetPasswordEmail').mockResolvedValue(true);

      // Mock Prisma responses
      const mockUser = {
        id: 'test-user-id',
        email: 'farhanwundari01@gmail.com',
        provider: 'LOCAL'
      };
      
      prismaClient.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      prismaClient.user.update = jest.fn().mockResolvedValue({});

      await userService.forgotPassword('farhanwundari01@gmail.com');

      // Verify database interactions
      expect(prismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { 
          email: 'farhanwundari01@gmail.com',
          provider: 'LOCAL'
        }
      });

      expect(prismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        data: {
          resetPasswordToken: 'hashed-token',
          resetPasswordExpire: expect.any(Date)
        }
      });

      // Verify token generation
      expect(tokenUtils.generateResetToken).toHaveBeenCalled();
      expect(tokenUtils.hashToken).toHaveBeenCalledWith('test-token');

      // Verify email was sent
      expect(emailSender.sendResetPasswordEmail).toHaveBeenCalledWith(
        'farhanwundari01@gmail.com',
        expect.stringContaining(process.env.FRONTEND_URL)
      );
    });

    it('should reject for non-existent email', async () => {
      prismaClient.user.findUnique = jest.fn().mockResolvedValue(null);

      await expect(userService.forgotPassword('nonexistent@example.com'))
        .rejects.toThrow(new ResponseError(404, "User not found"));
    });


    it('should handle error when saving token fails', async () => {
      // Mock user exists
      prismaClient.user.findUnique = jest.fn().mockResolvedValue({
        id: 'test-user-id',
        email: 'farhanwundari01@gmail.com',
        provider: 'LOCAL'
      });

      // Mock token generation
      jest.spyOn(tokenUtils, 'generateResetToken').mockReturnValue('test-token');
      jest.spyOn(tokenUtils, 'hashToken').mockResolvedValue('hashed-token');

      // Mock update to fail
      prismaClient.user.update = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(userService.forgotPassword('farhanwundari01@gmail.com'))
        .rejects.toThrow('Database error');
    });

    it('should handle error when sending email fails', async () => {
      // Mock user exists
      prismaClient.user.findUnique = jest.fn().mockResolvedValue({
        id: 'test-user-id',
        email: 'farhanwundari01@gmail.com',
        provider: 'LOCAL'
      });

      // Mock token generation
      jest.spyOn(tokenUtils, 'generateResetToken').mockReturnValue('test-token');
      jest.spyOn(tokenUtils, 'hashToken').mockResolvedValue('hashed-token');

      // Mock successful update
      prismaClient.user.update = jest.fn().mockResolvedValue({});

      // Mock email to fail
      jest.spyOn(emailSender, 'sendResetPasswordEmail')
        .mockRejectedValue(new Error('Email failed'));

      await expect(userService.forgotPassword('farhanwundari01@gmail.com'))
        .rejects.toThrow('Email failed');
    });
  });

  describe('API Endpoint Tests', () => {
    it('should return 200 for valid request', async () => {
      jest.spyOn(userService, 'forgotPassword').mockResolvedValue(true);

      const result = await supertest(web)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'farhanwundari01@gmail.com'
        });

      expect(result.status).toBe(200);
      expect(result.body.message).toBe("Password reset link sent to email");
    });

    it('should return 404 for non-existent email', async () => {
      jest.spyOn(userService, 'forgotPassword')
        .mockRejectedValue(new ResponseError(404, "User not found"));

      const result = await supertest(web)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'notfound@example.com'
        });

      expect(result.status).toBe(404);
    });

  });
});



describe('POST /api/v1/auth/reset-password', function () {
  describe('Service Layer Tests', () => {
    let originalCompareTokens;
    let originalBcryptHash;
    let originalFindMany;
    let originalUpdate;

    beforeEach(() => {
      // Simpan implementasi asli
      originalCompareTokens = tokenUtils.compareTokens;
      originalBcryptHash = bcrypt.hash;
      originalFindMany = prismaClient.user.findMany;
      originalUpdate = prismaClient.user.update;
    });

    afterEach(() => {
      // Kembalikan implementasi asli
      tokenUtils.compareTokens = originalCompareTokens;
      bcrypt.hash = originalBcryptHash;
      prismaClient.user.findMany = originalFindMany;
      prismaClient.user.update = originalUpdate;
      jest.clearAllMocks();
    });

    it('should reset password with valid token', async () => {
      // Mock data
      const testToken = 'valid-token';
      const testPassword = 'newpassword123';
      const testUser = {
        id: 'user-id-123',
        resetPasswordToken: 'hashed-token',
        resetPasswordExpire: new Date(Date.now() + 3600000) // 1 jam dari sekarang
      };

      // Mock functions
      tokenUtils.compareTokens = jest.fn().mockResolvedValue(true);
      bcrypt.hash = jest.fn().mockResolvedValue('hashed-password');
      prismaClient.user.findMany = jest.fn().mockResolvedValue([testUser]);
      prismaClient.user.update = jest.fn().mockResolvedValue({});

      await userService.resetPassword(testToken, testPassword, testPassword);

      // Verifikasi
      expect(prismaClient.user.findMany).toHaveBeenCalledWith({
        where: {
          resetPasswordExpire: { gt: expect.any(Date) }
        }
      });
      expect(tokenUtils.compareTokens).toHaveBeenCalledWith(testToken, testUser.resetPasswordToken);
      expect(bcrypt.hash).toHaveBeenCalledWith(testPassword, 10);
      expect(prismaClient.user.update).toHaveBeenCalledWith({
        where: { id: testUser.id },
        data: {
          password: 'hashed-password',
          resetPasswordToken: null,
          resetPasswordExpire: null
        }
      });
    });

    it('should reject with mismatched passwords', async () => {
      await expect(userService.resetPassword('any-token', 'password1', 'password2'))
        .rejects.toThrow(new ResponseError(400, "Password and confirm password do not match"));
    });

    it('should reject with expired token', async () => {
      // Mock user dengan token expired
      const expiredUser = {
        id: 'user-id-123',
        resetPasswordToken: 'hashed-token',
        resetPasswordExpire: new Date(Date.now() - 3600000) // 1 jam yang lalu
      };

      prismaClient.user.findMany = jest.fn().mockResolvedValue([expiredUser]);

      await expect(userService.resetPassword('expired-token', 'newpass', 'newpass'))
        .rejects.toThrow(new ResponseError(400, "Invalid or expired token"));
    });

    it('should reject with invalid token', async () => {
      // Mock user dengan token valid
      const testUser = {
        id: 'user-id-123',
        resetPasswordToken: 'hashed-token',
        resetPasswordExpire: new Date(Date.now() + 3600000)
      };

      // Mock functions
      prismaClient.user.findMany = jest.fn().mockResolvedValue([testUser]);
      tokenUtils.compareTokens = jest.fn().mockResolvedValue(false);

      await expect(userService.resetPassword('invalid-token', 'newpass', 'newpass'))
        .rejects.toThrow(new ResponseError(400, "Invalid or expired token"));
    });

    it('should handle database error when finding users', async () => {
      prismaClient.user.findMany = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(userService.resetPassword('any-token', 'newpass', 'newpass'))
        .rejects.toThrow('Database error');
    });

    it('should handle error when updating password', async () => {
      const testUser = {
        id: 'user-id-123',
        resetPasswordToken: 'hashed-token',
        resetPasswordExpire: new Date(Date.now() + 3600000)
      };

      prismaClient.user.findMany = jest.fn().mockResolvedValue([testUser]);
      tokenUtils.compareTokens = jest.fn().mockResolvedValue(true);
      bcrypt.hash = jest.fn().mockResolvedValue('hashed-password');
      prismaClient.user.update = jest.fn().mockRejectedValue(new Error('Update failed'));

      await expect(userService.resetPassword('valid-token', 'newpass', 'newpass'))
        .rejects.toThrow('Update failed');
    });
  });

  describe('API Endpoint Tests', () => {
    let originalResetPassword;

    beforeEach(async () => {
      await createTestUser();
      originalResetPassword = userService.resetPassword;
    });

    afterEach(async () => {
      await removeTestUser();
      userService.resetPassword = originalResetPassword;
    });

    it('should return 200 for valid reset password request', async () => {
      userService.resetPassword = jest.fn().mockResolvedValue(true);

      const result = await supertest(web)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'valid-token',
          password: 'newpassword123',
          confirmPassword: 'newpassword123'
        });

      expect(result.status).toBe(200);
      expect(result.body.message).toBe("Password reset successful");
    });

    it('should return 400 for mismatched passwords', async () => {
      const result = await supertest(web)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'any-token',
          password: 'password1',
          confirmPassword: 'password2'
        });

      expect(result.status).toBe(400);
      expect(result.body.errors).toBeDefined();
    });

    it('should return 400 for invalid/expired token', async () => {
      userService.resetPassword = jest.fn()
        .mockRejectedValue(new ResponseError(400, "Invalid or expired token"));

      const result = await supertest(web)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'newpassword123',
          confirmPassword: 'newpassword123'
        });

      expect(result.status).toBe(400);
      expect(result.body.errors).toBeDefined();
    });

    // it('should return 500 for server error', async () => {
    //   userService.resetPassword = jest.fn()
    //     .mockRejectedValue(new Error('Internal server error'));

    //   const result = await supertest(web)
    //     .post('/api/v1/auth/reset-password')
    //     .send({
    //       token: 'valid-token',
    //       password: 'newpassword123',
    //       confirmPassword: 'newpassword123'
    //     });

    //   expect(result.status).toBe(500);
    // });

  });
});


jest.mock('../../src/utils/google-oauth.js');

describe('POST api/v1/auth/google', () => {
  describe('Service Layer - googleAuth', () => {
    let originalFindUnique;
    let originalCreate;
    let originalUpdate;
    let originalJwtSign;

    beforeEach(() => {
      // Simpan implementasi asli
      originalFindUnique = prismaClient.user.findUnique;
      originalCreate = prismaClient.user.create;
      originalUpdate = prismaClient.user.update;
      originalJwtSign = jwt.sign;
    });

    afterEach(() => {
      // Kembalikan implementasi asli
      prismaClient.user.findUnique = originalFindUnique;
      prismaClient.user.create = originalCreate;
      prismaClient.user.update = originalUpdate;
      jwt.sign = originalJwtSign;
      jest.clearAllMocks();
    });

    it('should create new user and return token for new Google user', async () => {
      // Mock data
      const testToken = 'google-token-123';
      const googlePayload = {
        name: 'John Doe',
        email: 'john.doe@gmail.com',
        picture: 'avatar-url'
      };

      // Mock functions
      googleOAuth.verifyGoogleToken.mockResolvedValue(googlePayload);
      prismaClient.user.findUnique = jest.fn().mockResolvedValue(null);
      prismaClient.user.create = jest.fn().mockResolvedValue({
        id: 'user-id-123',
        fullName: googlePayload.name,
        email: googlePayload.email,
        phone: null,
        avatar: googlePayload.picture,
        role: 'USER',
        provider: 'GOOGLE'
      });
      prismaClient.user.update = jest.fn().mockResolvedValue({});
      jwt.sign = jest.fn().mockReturnValue('jwt-token-123');

      const result = await userService.googleAuth(testToken);

      // Verifikasi
      expect(googleOAuth.verifyGoogleToken).toHaveBeenCalledWith(testToken);
      expect(prismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: googlePayload.email },
        select: expect.any(Object)
      });
      expect(prismaClient.user.create).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalled();
      expect(prismaClient.user.update).toHaveBeenCalled();

      expect(result).toEqual({
        id: 'user-id-123',
        fullName: 'John Doe',
        email: 'john.doe@gmail.com',
        phone: null,
        role: 'USER',
        avatar: 'avatar-url',
        token: 'jwt-token-123',
        provider: 'GOOGLE'
      });
    });

    // it('should return token for existing Google user', async () => {
    //   const testToken = 'google-token-123';
    //   const googlePayload = {
    //     name: 'John Doe',
    //     email: 'john.doe@gmail.com',
    //     picture: 'avatar-url'
    //   };

    //   // Mock existing user
    //   const existingUser = {
    //     id: 'user-id-123',
    //     fullName: 'John Doe',
    //     email: 'john.doe@gmail.com',
    //     phone: null,
    //     avatar: 'avatar-url',
    //     role: 'USER',
    //     provider: 'GOOGLE'
    //   };

    //   googleOAuth.verifyGoogleToken.mockResolvedValue(googlePayload);
    //   prismaClient.user.findUnique = jest.fn().mockResolvedValue(existingUser);
    //   jwt.sign = jest.fn().mockReturnValue('jwt-token-123');
    //   prismaClient.user.update = jest.fn().mockResolvedValue({});

    //   const result = await userService.googleAuth(testToken);

    //   expect(googleOAuth.verifyGoogleToken).toHaveBeenCalledWith(testToken);
    //   expect(prismaClient.user.findUnique).toHaveBeenCalled();
    //   expect(prismaClient.user.create).not.toHaveBeenCalled();
    //   expect(result.token).toBe('jwt-token-123');
    // });

    it('should reject if email registered with non-Google provider', async () => {
      const testToken = 'google-token-123';
      const googlePayload = {
        name: 'John Doe',
        email: 'john.doe@gmail.com',
        picture: 'avatar-url'
      };

      // Mock existing user with LOCAL provider
      const existingUser = {
        id: 'user-id-123',
        fullName: 'John Doe',
        email: 'john.doe@gmail.com',
        provider: 'LOCAL'
      };

      googleOAuth.verifyGoogleToken.mockResolvedValue(googlePayload);
      prismaClient.user.findUnique = jest.fn().mockResolvedValue(existingUser);

      await expect(userService.googleAuth(testToken))
        .rejects.toThrow(new ResponseError(400, 'Email already registered with LOCAL provider'));
    });

    // it('should handle Google token verification error', async () => {
    //   const testToken = 'invalid-token';

    //   googleOAuth.verifyGoogleToken.mockRejectedValue(new Error('Invalid token'));

    //   await expect(userService.googleAuth(testToken))
    //     .rejects.toThrow(new ResponseError(401, 'Google authentication failed'));
    // });

    it('should handle database error when creating user', async () => {
      const testToken = 'google-token-123';
      const googlePayload = {
        name: 'John Doe',
        email: 'john.doe@gmail.com',
        picture: 'avatar-url'
      };

      googleOAuth.verifyGoogleToken.mockResolvedValue(googlePayload);
      prismaClient.user.findUnique = jest.fn().mockResolvedValue(null);
      prismaClient.user.create = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(userService.googleAuth(testToken))
        .rejects.toThrow('Database error');
    });
  });

  describe('API Endpoint - /api/v1/auth/google', () => {
    let originalGoogleAuth;

    beforeEach(() => {
      originalGoogleAuth = userService.googleAuth;
    });

    afterEach(() => {
      userService.googleAuth = originalGoogleAuth;
    });

    it('should return 200 with user data for valid Google token', async () => {
      const mockData = {
        id: 'user-id-123',
        fullName: 'John Doe',
        email: 'john.doe@gmail.com',
        token: 'jwt-token-123',
        provider: 'GOOGLE'
      };

      userService.googleAuth = jest.fn().mockResolvedValue(mockData);

      const response = await supertest(web)
        .post('/api/v1/auth/google')
        .send({ access_token: 'valid-token' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockData);
    });

    // it('should return 400 for invalid request body', async () => {
    //   // Mock validation to fail
    //   const originalValidate = require('../../src/validation/user-validation.js').googleAuthValidation.validateAsync;
    //   require('../../src/validation/user-validation.js').googleAuthValidation.validateAsync = jest.fn()
    //     .rejectedValue(new Error('Validation error'));

    //   const response = await supertest(web)
    //     .post('/api/v1/auth/google')
    //     .send({ invalid_field: 'token' });

    //   expect(response.status).toBe(400);
      
    //   // Restore original implementation
    //   require('../../src/validation/user-validation.js').googleAuthValidation.validateAsync = originalValidate;
    // });

    it('should return 401 for invalid Google token', async () => {
      userService.googleAuth = jest.fn()
        .mockRejectedValue(new ResponseError(401, 'Invalid Google token'));

      const response = await supertest(web)
        .post('/api/v1/auth/google')
        .send({ access_token: 'invalid-token' });

      expect(response.status).toBe(401);
    });

    it('should return 400 for email registered with other provider', async () => {
      userService.googleAuth = jest.fn()
        .mockRejectedValue(new ResponseError(400, 'Email already registered with LOCAL provider'));

      const response = await supertest(web)
        .post('/api/v1/auth/google')
        .send({ access_token: 'valid-but-conflict-token' });

      expect(response.status).toBe(400);
    });
  });
});


describe('userService.getAllUsersForAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return list of users with role USER', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '08123456789',
        role: 'USER',
        avatar: null,
        provider: 'LOCAL',
        createdAt: new Date()
      }
    ];

    const spy = jest
      .spyOn(prismaClient.user, 'findMany')
      .mockResolvedValue(mockUsers);

    const result = await userService.getAllUsersForAdmin();

    expect(spy).toHaveBeenCalledWith({
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
      orderBy: {
        createdAt: 'desc'
      }
    });

    expect(result).toEqual(mockUsers);
  });

  it('should return empty array when no users found', async () => {
    jest.spyOn(prismaClient.user, 'findMany').mockResolvedValue([]);

    const result = await userService.getAllUsersForAdmin();

    expect(result).toEqual([]);
  });

  it('should throw error if database query fails', async () => {
    jest
      .spyOn(prismaClient.user, 'findMany')
      .mockRejectedValue(new Error('DB error'));

    await expect(userService.getAllUsersForAdmin()).rejects.toThrow('DB error');
  });
});


// describe('GET /api/v1/admin/users', function () {
//   let adminToken;
//   let regularUserToken;

//   beforeAll(async () => {
//     // Make sure to remove any existing test users first
//     await removeTestUser();
//     await removeTestAdmin();
    
//     // Create fresh test users
//     await createTestAdmin();
//     await createTestUser();
    
//     // Login as admin to get token - add error handling
//     const adminLogin = await supertest(web)
//       .post('/api/v1/auth/login')
//       .send({
//         email: 'admin@example.com',
//         password: 'admin123'
//       });
    
//     if (!adminLogin.body.data || !adminLogin.body.data.token) {
//       console.error('Admin login failed:', adminLogin.body);
//       throw new Error('Admin login failed');
//     }
//     adminToken = adminLogin.body.data.token;

//     // Login as regular user to get token - add error handling
//     const userLogin = await supertest(web)
//       .post('/api/v1/auth/login')
//       .send({
//         email: 'farhanwundari01@gmail.com',
//         password: 'password123'
//       });
    
//     if (!userLogin.body.data || !userLogin.body.data.token) {
//       console.error('User login failed:', userLogin.body);
//       throw new Error('User login failed');
//     }
//     regularUserToken = userLogin.body.data.token;
//   });

//   afterAll(async () => {
//     await removeTestUser();
//     await removeTestAdmin();
//   });

//   describe('Service Layer - getAllUsersForAdmin', () => {
//     beforeEach(() => {
//       jest.clearAllMocks();
//     });

//     it('should return all users with USER role', async () => {
//       // Mock Prisma response
//       const mockUsers = [{
//         id: 'user-1',
//         fullName: 'Test User',
//         email: 'test@example.com',
//         role: 'USER'
//       }];

//       jest.spyOn(prismaClient.user, 'findMany').mockResolvedValue(mockUsers);

//       const result = await userService.getAllUsersForAdmin();

//       expect(prismaClient.user.findMany).toHaveBeenCalledWith({
//         where: { role: 'USER' },
//         select: expect.any(Object),
//         orderBy: { createdAt: 'desc' }
//       });
//       expect(result).toEqual(mockUsers);
//     });

//     it('should return empty array when no users found', async () => {
//       jest.spyOn(prismaClient.user, 'findMany').mockResolvedValue([]);
//       const result = await userService.getAllUsersForAdmin();
//       expect(result).toEqual([]);
//     });

//     it('should throw error when database operation fails', async () => {
//       jest.spyOn(prismaClient.user, 'findMany')
//         .mockRejectedValue(new Error('Database error'));
//       await expect(userService.getAllUsersForAdmin())
//         .rejects.toThrow('Database error');
//     });
//   });

//   describe('API Endpoint - GET /api/v1/admin/users', () => {
//     it('should return 200 with users data for admin', async () => {
//       // Mock the service response
//       const mockUsers = [{
//         id: 'user-1',
//         fullName: 'Test User',
//         email: 'test@example.com',
//         role: 'USER'
//       }];
      
//       jest.spyOn(userService, 'getAllUsersForAdmin').mockResolvedValue(mockUsers);

//       const response = await supertest(web)
//         .get('/api/v1/admin/users')
//         .set('Authorization', adminToken);

//       expect(response.status).toBe(200);
//       expect(response.body.success).toBe(true);
//       expect(response.body.data).toEqual(mockUsers);
//     });

//     it('should return 403 for non-admin users', async () => {
//       const response = await supertest(web)
//         .get('/api/v1/admin/users')
//         .set('Authorization', regularUserToken);

//       expect(response.status).toBe(403);
//     });

//     it('should return 401 for unauthenticated requests', async () => {
//       const response = await supertest(web)
//         .get('/api/v1/admin/users');

//       expect(response.status).toBe(401);
//     });

//     it('should handle service errors properly', async () => {
//       jest.spyOn(userService, 'getAllUsersForAdmin')
//         .mockRejectedValue(new ResponseError(500, 'Service error'));

//       const response = await supertest(web)
//         .get('/api/v1/admin/users')
//         .set('Authorization', adminToken);

//       expect(response.status).toBe(500);
//       expect(response.body.errors.message).toBe('Service error');
//     });
//   });
// });







// describe('DELETE /api/v1/admin/users/:id', function () {
//   beforeEach(async () => {
//     await createTestAdmin();
//     await createTestUser();
//   });

//   afterEach(async () => {
//     await removeTestAdmin();
//     // User will be deleted by the test
//   });

//   it('should delete user by admin', async () => {
//     // Login as admin
//     const loginResponse = await supertest(web)
//       .post('/api/v1/auth/login')
//       .send({
//         email: 'admin@example.com',
//         password: 'admin123'
//       });

//     const token = loginResponse.body.data.token;
//     const userToDelete = await getTestUser();

//     const result = await supertest(web)
//       .delete(`/api/v1/admin/users/${userToDelete.id}`)
//       .set('Authorization', token);

//     expect(result.status).toBe(200);
//     expect(result.body.data.message).toContain("User deleted successfully");
//   });

//   it('should reject if user not found', async () => {
//     const loginResponse = await supertest(web)
//       .post('/api/v1/auth/login')
//       .send({
//         email: 'admin@example.com',
//         password: 'admin123'
//       });

//     const token = loginResponse.body.data.token;
//     const fakeUserId = "123e4567-e89b-12d3-a456-426614174000"; 

//     const result = await supertest(web)
//       .delete(`/api/v1/admin/users/${fakeUserId}`)
//       .set('Authorization', token);

//     expect(result.status).toBe(404);
//   });
// });

// describe('DELETE /api/v1/admin/users/:id', function () {
//   beforeEach(async () => {
//     await createTestAdmin();
//     await createTestUser();
//   });

//   afterEach(async () => {
//     await removeTestAdmin();
//     // User will be deleted by the test
//   });

//   it('should delete user by admin', async () => {
//     // Login as admin
//     const loginResponse = await supertest(web)
//       .post('/api/v1/auth/login')
//       .send({
//         email: 'admin@example.com',
//         password: 'admin123'
//       });

//     const token = loginResponse.body.data.token;
//     const userToDelete = await getTestUser();

//     const result = await supertest(web)
//       .delete(`/api/v1/admin/users/${userToDelete.id}`)
//       .set('Authorization', token);

//     expect(result.status).toBe(200);
//     expect(result.body.message).toContain("User deleted successfully"); // Changed from result.body.data.message
//   });

//   it('should reject if user not found', async () => {
//     const loginResponse = await supertest(web)
//       .post('/api/v1/auth/login')
//       .send({
//         email: 'admin@example.com',
//         password: 'admin123'
//       });

//     const token = loginResponse.body.data.token;
//     const fakeUserId = "123e4567-e89b-12d3-a456-426614174000"; 

//     const result = await supertest(web)
//       .delete(`/api/v1/admin/users/${fakeUserId}`)
//       .set('Authorization', token);

//     expect(result.status).toBe(404);
//   });
// });