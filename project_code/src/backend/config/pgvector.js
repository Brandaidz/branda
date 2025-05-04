// backend/config/pgvector.js
const { Pool } = require('pg');

const connectionString = process.env.PGVECTOR_DB_URL || 'postgres://branda:branda_pass@localhost:5432/branda_vector';
const pool = new Pool({ connectionString });

async function init() {
  await pool.query(\`
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE IF NOT EXISTS embeddings (
      id SERIAL PRIMARY KEY,
      userId TEXT NOT NULL,
      agent TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding vector(1536),
      created_at TIMESTAMP DEFAULT NOW()
    );
  \`);
}

module.exports = { pool, init };
