-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'GUSTO', 'OFFLINE');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'STRIPE';

