-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "scheduleSendEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "scheduledAt" TIMESTAMP(3);

