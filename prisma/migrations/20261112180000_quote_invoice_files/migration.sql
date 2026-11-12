-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "files" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "files" JSONB NOT NULL DEFAULT '[]';

