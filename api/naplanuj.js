// Naplánuje push notifikaci přes QStash (doručí ji se zpožděním na /api/posli).
// Tělo: { subscription, titulek, text, delaySekundy }
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Pouze POST' });
  if (!process.env.QSTASH_TOKEN) return res.status(503).json({ error: 'Server není nakonfigurovaný (chybí QSTASH_TOKEN)' });

  const { subscription, titulek, text, delaySekundy } = req.body || {};
  if (!subscription || !delaySekundy || delaySekundy < 1) {
    return res.status(400).json({ error: 'Chybí subscription nebo delaySekundy' });
  }

  const qstashUrl = process.env.QSTASH_URL || 'https://qstash-us-east-1.upstash.io';
  const cil = `https://${req.headers.host}/api/posli`;
  const hlavicky = {
    'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
    'Content-Type': 'application/json',
    'Upstash-Delay': `${Math.round(delaySekundy)}s`,
    'Upstash-Retries': '2',
  };
  // Preview nasazení chrání Vercel přihlášením – QStash potřebuje obtokový klíč
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    hlavicky['Upstash-Forward-x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }

  const odpoved = await fetch(`${qstashUrl}/v2/publish/${cil}`, {
    method: 'POST',
    headers: hlavicky,
    body: JSON.stringify({ subscription, titulek, text }),
  });
  const data = await odpoved.json().catch(() => ({}));
  if (!odpoved.ok) return res.status(502).json({ error: 'QStash odmítl zprávu', detail: data });

  res.status(200).json({ messageId: data.messageId });
};
