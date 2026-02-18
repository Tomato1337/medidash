-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "document";

-- CreateEnum
CREATE TYPE "document"."DocumentStatus" AS ENUM ('UPLOADING', 'PARSING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "document"."records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,
    "status" "document"."DocumentStatus" NOT NULL DEFAULT 'UPLOADING',
    "expectedDocumentsCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document"."documents" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "minioUrl" TEXT NOT NULL,
    "minioBucket" TEXT NOT NULL DEFAULT 'medical-documents',
    "minioObjectKey" TEXT NOT NULL,
    "status" "document"."DocumentStatus" NOT NULL DEFAULT 'UPLOADING',
    "errorMessage" TEXT,
    "failedPhase" TEXT,
    "extractedText" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document"."tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document"."record_tags" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document"."system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "records_userId_idx" ON "document"."records"("userId");

-- CreateIndex
CREATE INDEX "records_date_idx" ON "document"."records"("date");

-- CreateIndex
CREATE INDEX "documents_recordId_idx" ON "document"."documents"("recordId");

-- CreateIndex
CREATE INDEX "documents_userId_idx" ON "document"."documents"("userId");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "document"."documents"("status");

-- CreateIndex
CREATE INDEX "documents_createdAt_idx" ON "document"."documents"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "document"."tags"("name");

-- CreateIndex
CREATE INDEX "record_tags_recordId_idx" ON "document"."record_tags"("recordId");

-- CreateIndex
CREATE INDEX "record_tags_tagId_idx" ON "document"."record_tags"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "record_tags_recordId_tagId_key" ON "document"."record_tags"("recordId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "document"."system_settings"("key");

-- CreateIndex
CREATE INDEX "system_settings_category_idx" ON "document"."system_settings"("category");

-- AddForeignKey
ALTER TABLE "document"."documents" ADD CONSTRAINT "documents_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "document"."records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document"."record_tags" ADD CONSTRAINT "record_tags_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "document"."records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document"."record_tags" ADD CONSTRAINT "record_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "document"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
