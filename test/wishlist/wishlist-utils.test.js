// test/test-util.js

import bcrypt from "bcrypt";
import { prismaClient } from "../../src/application/database.js";

export const removeTestUser = async () => {
    await prismaClient.user.deleteMany({
        where: {
            username: "test"
        }
    });
};

export const createTestUser = async () => {
    await prismaClient.user.create({
        data: {
            username: "test",
            password: await bcrypt.hash("rahasia", 10),
            name: "test",
            token: "test"
        }
    });
};

export const getTestUser = async () => {
    return prismaClient.user.findUnique({
        where: {
            username: "test"
        }
    });
};

export const createTestProduct = async () => {
    return prismaClient.product.create({
        data: {
            name: "Test Product",
            price: 100000,
            description: "Test Description",
            imageUrl: "test.jpg"
        }
    });
};

export const getTestProduct = async () => {
    return prismaClient.product.findFirst({
        where: {
            name: "Test Product"
        }
    });
};

export const removeAllTestProducts = async () => {
    await prismaClient.product.deleteMany({
        where: {
            name: "Test Product"
        }
    });
};

export const createTestWishlist = async (userId, productId) => {
    return prismaClient.wishlist.create({
        data: {
            userId,
            productId
        }
    });
};

export const removeAllTestWishlists = async () => {
    await prismaClient.wishlist.deleteMany({
        where: {
            user: {
                username: "test"
            }
        }
    });
};