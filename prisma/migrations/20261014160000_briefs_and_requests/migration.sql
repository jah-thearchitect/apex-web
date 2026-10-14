-- CreateEnum
CREATE TYPE "BriefStatus" AS ENUM ('SENT', 'STARTED', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'DONE');

-- AlterTable
-- The database fills in a random token for existing and new clients.
ALTER TABLE "Client" ADD COLUMN "requestToken" TEXT NOT NULL DEFAULT replace((gen_random_uuid())::text, '-'::text, ''::text);
ALTER TABLE "Client" ADD COLUMN "updateLinkSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BuildBrief" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "status" "BriefStatus" NOT NULL DEFAULT 'SENT',
    "answers" JSONB NOT NULL DEFAULT '{}',
    "step" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "build" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "urgency" TEXT NOT NULL,
    "files" JSONB NOT NULL DEFAULT '[]',
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'NEW',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuildBrief_token_key" ON "BuildBrief"("token");

-- CreateIndex
CREATE UNIQUE INDEX "BuildBrief_invoiceId_key" ON "BuildBrief"("invoiceId");

-- CreateIndex
CREATE INDEX "BuildBrief_clientId_idx" ON "BuildBrief"("clientId");

-- CreateIndex
CREATE INDEX "ChangeRequest_clientId_idx" ON "ChangeRequest"("clientId");

-- CreateIndex
CREATE INDEX "ChangeRequest_status_idx" ON "ChangeRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Client_requestToken_key" ON "Client"("requestToken");

-- AddForeignKey
ALTER TABLE "BuildBrief" ADD CONSTRAINT "BuildBrief_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildBrief" ADD CONSTRAINT "BuildBrief_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

