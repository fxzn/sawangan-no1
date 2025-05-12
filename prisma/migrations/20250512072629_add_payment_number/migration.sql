-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentVaNumber" TEXT;

-- AlterTable
ALTER TABLE "PaymentLog" ADD COLUMN     "paymentVaNumber" TEXT;
