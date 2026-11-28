function supabaseConfig() {
  return {
    url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, ''),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    secret: process.env.PAYMENT_WEBHOOK_SECRET || '',
  };
}

function extractTransferCode(body) {
  const data = body?.data || body;
  const raw = [data?.transfer_code, data?.code, data?.content, data?.description, data?.note, data?.order_code, data?.orderCode, body?.content].filter(Boolean).join(' ');
  const m = String(raw).toUpperCase().match(/TTH[A-Z0-9]{6,}/);
  return m ? m[0] : String(data?.transfer_code || '').trim();
}

function parseAmount(body) {
  const data = body?.data || body;
  const raw = data?.amount ?? data?.transferAmount ?? data?.creditAmount ?? data?.value ?? data?.money ?? body?.amount;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(String(raw).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function isSuccessfulPayment(body) {
  const data = body?.data || body;
  const status = String(data?.status || data?.transferType || data?.type || body?.code || '').toLowerCase();
  if (!status) return true;
  return ['paid', 'success', 'successful', 'completed', 'complete', 'credit', 'in', '00', '0'].includes(status) || status.includes('success') || status.includes('paid');
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
  if (!isSuccessfulPayment(body)) { res.status(202).json({ ok: false, ignored: true, reason: 'payment_not_successful' }); return; }
  const transferCode = extractTransferCode(body);
  if (!transferCode) { res.status(400).json({ error: 'Missing transfer_code' }); return; }
  const amount = parseAmount(body);
  if (amount === null) { res.status(400).json({ error: 'Missing amount' }); return; }
  const data = body.data || body;
  const providerRef = String(data.provider_ref || data.transaction_id || data.reference || data.ref || data.id || body.id || '');
  const provider = String(data.provider || body.provider || 'webhook');
  const rpc = await fetch(`${cfg.url}/rest/v1/rpc/complete_payment_request`, {
    method: 'POST',
    headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_transfer_code: transferCode, p_provider_ref: providerRef, p_provider: provider, p_amount: amount }),
  });
  const data = await rpc.json().catch(() => ({}));
  if (!rpc.ok) { res.status(502).json({ error: 'Supabase RPC failed', detail: data }); return; }
  res.status(data?.ok ? 200 : (data?.error === 'amount_mismatch' || data?.error === 'duplicate_provider_ref' ? 409 : 404)).json(data);
}
