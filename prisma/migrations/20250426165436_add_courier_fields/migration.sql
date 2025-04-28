/*
  Warnings:

  - You are about to alter the column `weight` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - Added the required column `customerEmail` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerName` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerPhone` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `service_name` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingCity` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingCost` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingPostCode` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingProvince` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipping_name` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerEmail" TEXT NOT NULL,
ADD COLUMN     "customerName" TEXT NOT NULL,
ADD COLUMN     "customerPhone" TEXT NOT NULL,
ADD COLUMN     "estimatedDelivery" TEXT,
ADD COLUMN     "service_name" TEXT NOT NULL,
ADD COLUMN     "shippingCity" TEXT NOT NULL,
ADD COLUMN     "shippingCost" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "shippingPostCode" TEXT NOT NULL,
ADD COLUMN     "shippingProvince" TEXT NOT NULL,
ADD COLUMN     "shipping_name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "weight" SET DATA TYPE INTEGER;
