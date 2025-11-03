-- CreateExtension: pgvector для векторного поиска
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum: Role
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum: DocumentStatus
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum: PiiType
CREATE TYPE "PiiType" AS ENUM (
    'NAME',
    'ADDRESS',
    'PHONE',
    'EMAIL',
    'DATE',
    'ID',
    'OTHER'
);

-- CreateTable: User
CREATE TABLE
    "User" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "role" "Role" NOT NULL DEFAULT 'USER',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
    );

-- CreateTable: RefreshToken
CREATE TABLE
    "RefreshToken" (
        "id" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
    );

-- CreateTable: Record
CREATE TABLE
    "Record" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "summary" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
    );

-- CreateTable: Document
CREATE TABLE
    "Document" (
        "id" TEXT NOT NULL,
        "recordId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "originalFileName" TEXT NOT NULL,
        "mimeType" TEXT NOT NULL,
        "fileSize" INTEGER NOT NULL,
        "minioUrl" TEXT NOT NULL,
        "minioBucket" TEXT NOT NULL DEFAULT 'medical-documents',
        "minioObjectKey" TEXT NOT NULL,
        "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADING',
        "errorMessage" TEXT,
        "processedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
    );

-- CreateTable: DocumentChunk
CREATE TABLE
    "DocumentChunk" (
        "id" TEXT NOT NULL,
        "documentId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        "embedding" vector (1536),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
    );

-- CreateTable: PiiMapping
CREATE TABLE
    "PiiMapping" (
        "id" TEXT NOT NULL,
        "documentId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "original" TEXT NOT NULL,
        "replacement" TEXT NOT NULL,
        "type" "PiiType" NOT NULL,
        "encryptionIv" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PiiMapping_pkey" PRIMARY KEY ("id")
    );

-- CreateTable: ProcessingLog
CREATE TABLE
    "ProcessingLog" (
        "id" TEXT NOT NULL,
        "documentId" TEXT NOT NULL,
        "step" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "message" TEXT,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ProcessingLog_pkey" PRIMARY KEY ("id")
    );

-- CreateTable: Tag
CREATE TABLE
    "Tag" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "color" TEXT,
        "isSystem" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
    );

-- CreateTable: RecordTag
CREATE TABLE
    "RecordTag" (
        "id" TEXT NOT NULL,
        "recordId" TEXT NOT NULL,
        "tagId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RecordTag_pkey" PRIMARY KEY ("id")
    );

-- CreateTable: SystemSetting
CREATE TABLE
    "SystemSetting" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
    );

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");

CREATE INDEX "User_email_idx" ON "User" ("email");

CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken" ("token");

CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken" ("userId");

CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken" ("token");

CREATE INDEX "Record_userId_idx" ON "Record" ("userId");

CREATE INDEX "Record_date_idx" ON "Record" ("date");

CREATE INDEX "Document_recordId_idx" ON "Document" ("recordId");

CREATE INDEX "Document_userId_idx" ON "Document" ("userId");

CREATE INDEX "Document_status_idx" ON "Document" ("status");

CREATE INDEX "Document_createdAt_idx" ON "Document" ("createdAt");

CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk" ("documentId");

CREATE INDEX "DocumentChunk_userId_idx" ON "DocumentChunk" ("userId");

CREATE INDEX "DocumentChunk_order_idx" ON "DocumentChunk" ("order");

CREATE INDEX "PiiMapping_documentId_idx" ON "PiiMapping" ("documentId");

CREATE INDEX "PiiMapping_userId_idx" ON "PiiMapping" ("userId");

CREATE INDEX "ProcessingLog_documentId_idx" ON "ProcessingLog" ("documentId");

CREATE INDEX "ProcessingLog_createdAt_idx" ON "ProcessingLog" ("createdAt");

CREATE UNIQUE INDEX "Tag_name_key" ON "Tag" ("name");

CREATE INDEX "Tag_name_idx" ON "Tag" ("name");

CREATE INDEX "RecordTag_recordId_idx" ON "RecordTag" ("recordId");

CREATE INDEX "RecordTag_tagId_idx" ON "RecordTag" ("tagId");

CREATE UNIQUE INDEX "RecordTag_recordId_tagId_key" ON "RecordTag" ("recordId", "tagId");

CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting" ("key");

CREATE INDEX "SystemSetting_category_idx" ON "SystemSetting" ("category");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Record" ADD CONSTRAINT "Record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Document" ADD CONSTRAINT "Document_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PiiMapping" ADD CONSTRAINT "PiiMapping_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProcessingLog" ADD CONSTRAINT "ProcessingLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecordTag" ADD CONSTRAINT "RecordTag_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecordTag" ADD CONSTRAINT "RecordTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE;