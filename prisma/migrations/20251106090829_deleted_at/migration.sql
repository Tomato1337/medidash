/*
  Warnings:

  - Added the required column `fileName` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "document_chunk_embedding_ivfflat_idx";

-- DropIndex
DROP INDEX "Tag_name_idx";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "fileName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "deletedAt" TIMESTAMP(3);
