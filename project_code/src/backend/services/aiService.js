// backend/services/aiService.js
import fetch from 'node-fetch';

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OR_KEY = process.env.OPENROUTER_KEY;
if (!OR_KEY) throw new Error('OPENROUTER_KEY manquant dans .env');

export async function generateChat(messages) {
  const res = await fetch(OR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OR_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',    // ou un autre modèle disponible via OpenRouter
      messages
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err}`);
  }
  const { choices } = await res.json();
  return choices[0].message.content;
}

// No need for module.exports in ESM

