import { cleanName, isFullName, saveGuest } from '../lib/store.js';

// Confirmação pública: o convidado manda nome completo e se vai ou não.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const name = cleanName(req.body?.name);
  if (!isFullName(name)) {
    return res.status(400).json({ error: 'Escreva seu nome completo (nome e sobrenome).' });
  }

  try {
    const guest = await saveGuest(name, req.body?.going === true);
    return res.status(200).json({ ok: true, updated: guest.existed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Não foi possível salvar agora. Tente de novo.' });
  }
}
