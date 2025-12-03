-- AlterEnum
ALTER TYPE "DocumentStatus" ADD VALUE 'PARSING';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "failedPhase" TEXT,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "expectedDocumentsCount" INTEGER;
