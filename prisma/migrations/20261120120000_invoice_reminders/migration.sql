-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "autoReminders" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "InvoiceReminder" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "claimKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceReminder_claimKey_key" ON "InvoiceReminder"("claimKey");

-- CreateIndex
CREATE INDEX "InvoiceReminder_invoiceId_createdAt_idx" ON "InvoiceReminder"("invoiceId", "createdAt");

-- AddForeignKey
ALTER TABLE "InvoiceReminder" ADD CONSTRAINT "InvoiceReminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

