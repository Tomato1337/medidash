-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "processing";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "processing"."PiiType" AS ENUM ('NAME', 'ADDRESS', 'PHONE', 'EMAIL', 'DATE', 'ID', 'OTHER');

-- CreateTable
CREATE TABLE "processing"."document_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing"."pii_mappings" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "original" TEXT NOT NULL,
    "replacement" TEXT NOT NULL,
    "type" "processing"."PiiType" NOT NULL,
    "encryptionIv" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pii_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing"."processing_logs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkId" TEXT,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_chunks_documentId_idx" ON "processing"."document_chunks"("documentId");

-- CreateIndex
CREATE INDEX "document_chunks_userId_idx" ON "processing"."document_chunks"("userId");

-- CreateIndex
CREATE INDEX "document_chunks_recordId_idx" ON "processing"."document_chunks"("recordId");

-- CreateIndex
CREATE INDEX "document_chunks_order_idx" ON "processing"."document_chunks"("order");

-- CreateIndex
CREATE INDEX "pii_mappings_documentId_idx" ON "processing"."pii_mappings"("documentId");

-- CreateIndex
CREATE INDEX "pii_mappings_chunkId_idx" ON "processing"."pii_mappings"("chunkId");

-- CreateIndex
CREATE INDEX "pii_mappings_userId_idx" ON "processing"."pii_mappings"("userId");

-- CreateIndex
CREATE INDEX "processing_logs_documentId_idx" ON "processing"."processing_logs"("documentId");

-- CreateIndex
CREATE INDEX "processing_logs_createdAt_idx" ON "processing"."processing_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "processing"."pii_mappings" ADD CONSTRAINT "pii_mappings_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "processing"."document_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing"."processing_logs" ADD CONSTRAINT "processing_logs_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "processing"."document_chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
