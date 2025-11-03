-- pgvector indexes for DocumentChunk.embedding
-- Run this after initial migration is complete
-- IVFFlat index for fast approximate nearest neighbor search
-- Uses cosine distance for similarity search
-- Lists parameter (100) should be ~sqrt(total_rows) for optimal performance
CREATE INDEX IF NOT EXISTS document_chunk_embedding_ivfflat_idx ON "DocumentChunk" USING ivfflat (embedding vector_cosine_ops)
WITH
    (lists = 100);

-- Alternative: HNSW index (requires pgvector 0.5.0+)
-- Generally faster than IVFFlat but uses more memory
-- Uncomment if you have pgvector 0.5.0+ and want better performance
-- CREATE INDEX IF NOT EXISTS document_chunk_embedding_hnsw_idx 
-- ON "DocumentChunk" 
-- USING hnsw (embedding vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);
-- Analyze table for better query planning
ANALYZE "DocumentChunk";