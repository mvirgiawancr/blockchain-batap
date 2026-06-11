-- Full RAG: chunk store dengan pgvector
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS document_chunks (
  id            SERIAL PRIMARY KEY,
  submission_id VARCHAR,            -- NULL untuk PEDOMAN (global)
  doc_type      VARCHAR(10) NOT NULL CHECK (doc_type IN ('LED','LKPS','PEDOMAN')),
  chunk_index   INT NOT NULL,
  content       TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  embedding     vector(768),
  content_tsv   tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON document_chunks USING gin (content_tsv);
CREATE INDEX IF NOT EXISTS idx_chunks_lookup ON document_chunks (doc_type, submission_id);
