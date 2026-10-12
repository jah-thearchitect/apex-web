-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "BookingSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "title" TEXT NOT NULL DEFAULT 'Consultation',
    "description" TEXT NOT NULL DEFAULT 'Connect with Apex to discuss your vision.',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "bufferMin" INTEGER NOT NULL DEFAULT 15,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 72,
    "windowDays" INTEGER NOT NULL DEFAULT 14,
    "weeklyHours" TEXT NOT NULL DEFAULT '{"0":[],"1":[["10:00","13:30"]],"2":[["10:00","13:30"]],"3":[["10:00","13:30"]],"4":[["10:00","13:30"]],"5":[["10:00","13:30"]],"6":[["14:00","17:30"]]}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleConnection" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "email" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "slotKey" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "businessName" TEXT,
    "topic" TEXT NOT NULL,
    "contactId" TEXT,
    "googleEventId" TEXT,
    "meetLink" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_token_key" ON "Booking"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_slotKey_key" ON "Booking"("slotKey");

-- CreateIndex
CREATE INDEX "Booking_startAt_idx" ON "Booking"("startAt");

