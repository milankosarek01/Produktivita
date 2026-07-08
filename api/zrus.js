// Stornuje naplánovanou push notifikaci (např. při pauze časovače nebo splnění úkolu).
// Tělo: { messageId }
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Pouze POST' });
  if (!process.env.QSTASH_TOKEN) return res.status(503).json({ error: 'Server není nakonfigurovaný' });

  const { messageId } = req.body || {};
  if (!messageId) return res.status(400).json({ error: 'Chybí messageId' });

  const odpoved = await fetch(`https://qstash.upstash.io/v2/messages/${messageId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${process.env.QSTASH_TOKEN}` },
  });

  res.status(200).json({ ok: odpoved.ok });
};
