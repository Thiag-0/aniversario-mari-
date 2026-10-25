// Lista de convidados guardada num hash do Redis (Upstash, via integração da Vercel).
// Cada campo é o nome normalizado, então a mesma pessoa nunca aparece duas vezes.

const HASH = 'mari24:guests';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...command) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error('Banco de dados não configurado');
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Redis respondeu ${res.status}`);
  return data.result;
}

export const cleanName = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);

export const keyOf = (name) =>
  cleanName(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export async function listGuests() {
  const flat = (await redis('HGETALL', HASH)) || [];
  const guests = [];
  for (let i = 0; i < flat.length; i += 2) {
    try { guests.push({ key: flat[i], ...JSON.parse(flat[i + 1]) }); } catch {}
  }
  return guests;
}

// Grava ou atualiza; devolve true se a pessoa já estava na lista.
export async function saveGuest(name, going) {
  const key = keyOf(name);
  const record = { name: cleanName(name), going: !!going, at: new Date().toISOString() };
  const isNew = await redis('HSET', HASH, key, JSON.stringify(record));
  return { key, ...record, existed: isNew === 0 };
}

export async function removeGuest(key) {
  return (await redis('HDEL', HASH, String(key))) > 0;
}
