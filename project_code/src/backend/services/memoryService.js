// backend/services/memoryService.js
const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.PG_CONNECTION;
if (!connectionString) {
  console.error('PG_CONNECTION missing in .env');
  process.exit(1);
}

const client = new Client({ connectionString });
client.connect()
  .then(() => console.log('Connected to Postgres for memoryService'))
  .catch(err => {
    console.error('Postgres connection error:', err);
    process.exit(1);
  });

/**
 * Enregistre un texte et son embedding dans la table 'embeddings'
 * @param {string} userId 
 * @param {string} text 
 * @param {Array<number>} embedding 
 */
async function saveEmbedding(userId, text, embedding) {
  const query = `
    INSERT INTO embeddings (user_id, content, vector)
    VALUES ($1, $2, $3)
  `;
  await client.query(query, [userId, text, embedding]);
}

/**
 * RÃ©cupÃ¨re les contenus les plus proches de l'embedding fourni
 * @param {string} userId 
 * @param {Array<number>} embedding 
 * @param {number} limit 
 * @returns {Promise<string>} concatÃ©nation des contenus  
 */
async function queryMemory(userId, embedding, limit = 5) {
  const query = `
    SELECT content
    FROM embeddings
    WHERE user_id = $1
    ORDER BY vector <-> $2
    LIMIT $3
  `;
  const { rows } = await client.query(query, [userId, embedding, limit]);
  return rows.map(r => r.content).join('\n');
}

module.exports = { saveEmbedding, queryMemory };