// test/profile/profile-utils.test.js
import { prismaClient } from "../../src/application/database.js";
import bcrypt from "bcrypt";

export const createTestProfileUser = async () => {
    return await prismaClient.user.create({
        data: {
            // id: '550e8400-e29b-41d4-a716-446655440000',
            fullName: 'Test User',
            email: 'test@example.com',
            phone: '08123456789',
            password: await bcrypt.hash("rahasia", 10),
            role: 'USER',
            avatar: 'https://example.com/avatar.jpg',
            // Tambahkan field wajib lainnya sesuai schema Prisma Anda
            provider: 'LOCAL',
            isVerified: true
        }
    });
}

export const removeTestProfileUser = async () => {
    await prismaClient.user.deleteMany({
        where: {
            email: 'test@example.com' // Menggunakan email sebagai identifier
        }
    });
}

export const getTestProfileUser = async () => {
    return prismaClient.user.findUnique({
        where: {
            email: 'test@example.com' // Menggunakan email sebagai identifier
        }
    });
}