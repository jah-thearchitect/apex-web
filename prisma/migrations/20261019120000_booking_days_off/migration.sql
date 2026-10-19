-- AlterTable
ALTER TABLE "BookingSettings" ADD COLUMN     "daysOff" TEXT[] DEFAULT ARRAY[]::TEXT[];

