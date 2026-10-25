import { createHash, timingSafeEqual } from 'node:crypto';
import { cleanName, keyOf, listGuests, removeGuest, saveGuest } from '../lib/store.js';

// Área do moderador. Toda chamada precisa da senha (variável ADMIN_PASSWORD na Vercel).
const digest = (s) => createHash('sha256').update(String(s)).digest();

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const given = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return timingSafeEqual(digest(given), digest(expected));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!authorized(req)) return res.status(401).json({ error: 'Senha incorreta.' });

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ guests: await listGuests() });
    }

    if (req.method === 'POST') {
      const name = cleanName(req.body?.name);
      if (name.length < 2) return res.status(400).json({ error: 'Escreva o nome do convidado.' });
      await saveGuest(name, req.body?.going === true);
      return res.status(200).json({ guests: await listGuests() });
    }

    if (req.method === 'PUT') {
      const { key } = req.body || {};
      const name = cleanName(req.body?.name);
      if (!key || name.length < 2) return res.status(400).json({ error: 'Dados inválidos.' });
      if (keyOf(name) !== key) await removeGuest(key);
      await saveGuest(name, req.body?.going === true);
      return res.status(200).json({ guests: await listGuests() });
    }

    if (req.method === 'DELETE') {
      const key = req.query?.key;
      if (!key) return res.status(400).json({ error: 'Convidado não informado.' });
      await removeGuest(key);
      return res.status(200).json({ guests: await listGuests() });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro no servidor. Tente de novo.' });
  }
}
