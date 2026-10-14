-- AlterTable
ALTER TABLE "ChangeRequest" ADD COLUMN     "invoiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequest_invoiceId_key" ON "ChangeRequest"("invoiceId");

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

