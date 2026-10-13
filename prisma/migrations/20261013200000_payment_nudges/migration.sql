-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paymentNudgeAt" TIMESTAMP(3),
ADD COLUMN     "paymentNudgeCount" INTEGER NOT NULL DEFAULT 0;

