function supabaseConfig() {
  return {
    url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    secret: process.env.PAYMENT_WEBHOOK_SECRET || '',
  };
}

function extractTransferCode(body) {
  const raw = [body?.transfer_code, body?.code, body?.content, body?.description, body?.note, body?.order_code].filter(Boolean).join(' ');
  const m = String(raw).toUpperCase().match(/TTH[A-Z0-9]{6,}/);
  return m ? m[0] : String(body?.transfer_code || '').trim();
}

export default async function handler(req, res) {
  const cfg = supabaseConfig();
  if (req.method === 'GET') {
    res.status(200).json({ enabled: Boolean(cfg.url && cfg.key && cfg.secret), provider: 'payment-webhook' });
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!cfg.url || !cfg.key || !cfg.secret) { res.status(503).json({ error: 'Payment webhook is not configured' }); return; }
  const secret = req.headers['x-payment-secret'] || req.headers['x-webhook-secret'] || '';
  if (secret !== cfg.secret) { res.status(401).json({ error: 'Invalid webhook secret' }); return; }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const transferCode = extractTransferCode(body);
  if (!transferCode) { res.status(400).json({ error: 'Missing transfer_code' }); return; }
  const providerRef = String(body.provider_ref || body.transaction_id || body.id || body.ref || '');
  const provider = String(body.provider || 'webhook');
  const rpc = await fetch(`${cfg.url}/rest/v1/rpc/complete_payment_request`, {
    method: 'POST',
    headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_transfer_code: transferCode, p_provider_ref: providerRef, p_provider: provider }),
  });
  const data = await rpc.json().catch(() => ({}));
  if (!rpc.ok) { res.status(502).json({ error: 'Supabase RPC failed', detail: data }); return; }
  res.status(data?.ok ? 200 : 404).json(data);
}
