import bcrypt from "bcrypt";
import { prismaClient } from "../../src/application/database.js";
import { hashToken } from "../../src/utils/token-utils.js";
import jwt from "jsonwebtoken";


export const removeTestUser = async () => {
    await prismaClient.user.deleteMany({
        where: {
            email: "test@example.com"
        }
    });
}

export const createTestUser = async () => {
    await prismaClient.user.create({
        data: {
            id: "test-id",
            fullName: "Test User",
            email: "test@example.com",
            phone: "1234567890",
            password: await bcrypt.hash("password123", 10),
            provider: 'LOCAL',
            isVerified: false,
            token: null
        }
    });
}

export const createTestUserLogout = async () => {
    const token = jwt.sign(
        { id: "test-user-id" },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    
    return await prismaClient.user.create({
        data: {
            id: "test-user-id",
            fullName: "Test User",
            email: "test@example.com",
            password: await bcrypt.hash("password123", 10),
            provider: 'LOCAL',
            isVerified: true,
            token: token // Pastikan token disimpan
        }
    });
};

export const createLocalTestUser = async () => {
    return await prismaClient.user.create({
        data: {
            id: "local-test-id",
            fullName: "Local User",
            email: "local@example.com",
            password: await bcrypt.hash("Password123!", 10),
            provider: 'LOCAL',
            isVerified: true,
            token: null
        }
    });
};

export const createGoogleTestUser = async () => {
    return await prismaClient.user.create({
        data: {
            id: "google-test-id",
            fullName: "Google User",
            email: "google@example.com",
            avatar: "https://google-avatar.jpg",
            provider: 'GOOGLE',
            isVerified: true,
            token: null
        }
    });
};


export const getTestUser = async () => {
    return prismaClient.user.findUnique({
        where: {
            email: "test@example.com"
        }
    });
};

export const createTestUserWithResetToken = async () => {
    const hashedToken = await hashToken("valid-reset-token");
    return await prismaClient.user.create({
        data: {
            id: "reset-test-id",
            fullName: "Reset Test User",
            email: "reset@example.com",
            phone: "081234567890",
            password: await bcrypt.hash("OldPassword123!", 10),
            provider: 'LOCAL',
            isVerified: true,
            resetPasswordToken: hashedToken,
            resetPasswordExpire: new Date(Date.now() + 3600000) 
        }
    });
};

export const removeTestUserByEmail = async (email) => {
    await prismaClient.user.deleteMany({
        where: { email }
    });
};



export const createAdminUser = async () => {
    return await prismaClient.user.create({
        data: {
            id: "admin-test-id",
            fullName: "Admin User",
            email: "admin@example.com",
            password: await bcrypt.hash("AdminPassword123!", 10),
            provider: 'LOCAL',
            role: 'ADMIN',
            isVerified: true,
            token: null
        }
    });
};

export const createRegularUser = async () => {
    return await prismaClient.user.create({
        data: {
            id: "regular-user-id",
            fullName: "Regular User",
            email: "regular@example.com",
            password: await bcrypt.hash("UserPassword123!", 10),
            provider: 'LOCAL',
            role: 'USER',
            isVerified: true,
            token: null
        }
    });
};

export const removeTestUsers = async () => {
    await prismaClient.user.deleteMany({
        where: {
            OR: [
                { email: 'admin@example.com' },
                { email: 'regular@example.com' }
            ]
        }
    });
};


export const createLoggedInUser = async () => {
    const token = jwt.sign({ id: "test-id" }, process.env.JWT_SECRET);
    return await prismaClient.user.create({
        data: {
            id: "test-id",
            fullName: "Test User",
            email: "test@example.com",
            password: await bcrypt.hash("Password123!", 10),
            provider: 'LOCAL',
            isVerified: true,
            token: token
        }
    });
};

export const removeTestUserById = async (id) => {
    await prismaClient.user.deleteMany({
        where: { id }
    });
};



export const mockUserWithRelations = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  products: [{ id: 'prod1', imageUrl: 'http://example.com/image1.jpg' }],
  carts: [{ id: 'cart1', items: [{ id: 'item1' }] }],
  orders: [
    { 
      id: 'order1', 
      items: [{ id: 'orderItem1' }],
      paymentLogs: [{ id: 'payment1' }],
      reviews: [{ id: 'review1' }]
    }
  ],
  reviews: [{ id: 'userReview1' }]
};

export const mockUserWithoutRelations = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  products: [],
  carts: [],
  orders: [],
  reviews: []
};

export const mockPrismaDeleteOperations = {
  cartItemDelete: { count: 1 },
  cartDelete: { count: 1 },
  paymentLogDelete: { count: 1 },
  orderItemDelete: { count: 1 },
  reviewDelete: { count: 1 },
  orderDelete: { count: 1 },
  userDelete: { id: '550e8400-e29b-41d4-a716-446655440000' }
};


// export const createAdminTestUser = async () => {
//     return await prismaClient.user.create({
//         data: {
//             id: "admin-test-id",
//             fullName: "Admin User",
//             email: "admin@example.com",
//             password: await bcrypt.hash("AdminPassword123!", 10),
//             provider: 'LOCAL',
//             role: 'ADMIN',
//             isVerified: true,
//             token: null
//         }
//     });
// };

// export const createMultipleTestUsers = async () => {

//     await prismaClient.user.createMany({
//         data: [
//             {
//                 id: "user1-id",
//                 fullName: "User One",
//                 email: "user1@example.com",
//                 provider: 'LOCAL',
//                 role: 'USER',
//                 isVerified: true
//             },
//             {
//                 id: "user2-id",
//                 fullName: "User Two",
//                 email: "user2@example.com",
//                 provider: 'GOOGLE',
//                 role: 'USER',
//                 isVerified: true
//             },
//             {
//                 id: "user3-id",
//                 fullName: "User Three",
//                 email: "user3@example.com",
//                 provider: 'LOCAL',
//                 role: 'USER',
//                 isVerified: false
//             }
//         ]
//     });
// };

// export const removeAllTestUsers = async () => {
//     await prismaClient.user.deleteMany({
//         where: {
//             OR: [
//                 { email: 'admin@example.com' },
//                 { email: 'user1@example.com' },
//                 { email: 'user2@example.com' },
//                 { email: 'user3@example.com' }
//             ]
//         }
//     });
// };