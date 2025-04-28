-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "customerEmail" DROP NOT NULL,
ALTER COLUMN "customerName" DROP NOT NULL,
ALTER COLUMN "customerPhone" DROP NOT NULL;
