-- AlterTable: Change embedding vector dimension from 1536 to 768 for Gemini text-embedding-004
-- First drop the old column and create new one (pgvector doesn't support ALTER)
ALTER TABLE "DocumentChunk"
DROP COLUMN IF EXISTS "embedding";

ALTER TABLE "DocumentChunk"
ADD COLUMN "embedding" vector (768);