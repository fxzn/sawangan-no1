/*
  Warnings:

  - The `midtransResponse` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "midtransResponse",
ADD COLUMN     "midtransResponse" JSONB;
