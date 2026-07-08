// Volá QStash v čas doručení. Pošle skutečnou push notifikaci na telefon.
// Tělo: { subscription, titulek, text }
const webpush = require('web-push');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Pouze POST' });

  const { subscription, titulek, text } = req.body || {};
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Chybí subscription' });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ titulek: titulek || 'Produktivita', text: text || '' })
    );
    res.status(200).json({ ok: true });
  } catch (e) {
    // 404/410 = odběr už neplatí (uživatel notifikace vypnul) – neopakovat
    res.status(200).json({ ok: false, chyba: e.statusCode || String(e) });
  }
};
