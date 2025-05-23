import { prismaClient } from "../../src/application/database.js";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";



export const createTestUser = async () => {
  return prismaClient.user.create({
    data: {
      id: uuid(),
      fullName: "test",
      email: "farhanwundari01@gmail.com", // Ubah ke email yang konsisten
      phone: "08123456789",
      password: await bcrypt.hash("password123", 10),
      provider: "LOCAL",
      role: "USER",
      isVerified: true
    }
  });
};

export const removeTestUser = async () => {
  await prismaClient.user.deleteMany({
    where: {
      OR: [
        { email: "farhanwundari01@gmail.com" }, // Sesuaikan
        { email: "test2@example.com" }
      ]
    }
  });
};





export const getTestUser = async () => {
  return prismaClient.user.findUnique({
    where: {
      email: "farhanwundari01@gmail.com" // Sesuaikan
    }
  });
};


// Admin user utilities
export const createTestAdmin = async () => {
  return prismaClient.user.create({
    data: {
      id: uuid(),
      fullName: "Admin",
      email: "admin@example.com",
      phone: "08123456788",
      password: await bcrypt.hash("admin123", 10),
      provider: "LOCAL",
      role: "ADMIN",
      isVerified: true
    }
  });
};

export const removeTestAdmin = async () => {
  await prismaClient.user.deleteMany({
    where: {
      email: "admin@example.com"
    }
  });
};

// Reset token utilities
export const createTestResetToken = async (userId) => {
  const resetToken = "test-reset-token";
  const hashedToken = await bcrypt.hash(resetToken, 10);
  const expireTime = new Date(Date.now() + 3600000); // 1 hour
  
  await prismaClient.user.update({
    where: { id: userId },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpire: expireTime
    }
  });
  
  return resetToken;
};

export const removeAllTestTokens = async () => {
  await prismaClient.user.updateMany({
    data: {
      resetPasswordToken: null,
      resetPasswordExpire: null
    }
  });
};


export async function createGoogleUser() {
  await prismaClient.user.create({
    data: {
      id: 'user-google-123',
      fullName: 'Google User',
      email: 'googleuser@example.com',
      phone: '08000000000',
      password: await bcrypt.hash('password123', 10),
      provider: 'GOOGLE',
      role: 'USER',
      isVerified: true
    }
  });
}

export async function removeGoogleUser() {
  await prismaClient.user.delete({
    where: {
      email: 'googleuser@example.com'
    }
  });
}
