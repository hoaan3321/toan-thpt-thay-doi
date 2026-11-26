const rate = new Map();

function providers() {
  const list = [];
  if (process.env.GROQ_API_KEY) list.push('groq');
  if (process.env.GEMINI_API_KEY) list.push('gemini');
  if (process.env.OPENAI_API_KEY) list.push('openai');
  if (process.env.OPENROUTER_API_KEY) list.push('openrouter');
  return list;
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-10).map((m) => ({
    role: m && m.role === 'assistant' ? 'assistant' : 'user',
    content: String((m && m.content) || '').slice(0, 4000),
  })).filter((m) => m.content.trim());
}

function systemPrompt(context) {
  const ctx = String(context || '').slice(0, 6000);
  return `Bạn là trợ lý AI của app Toán THPT Thầy Đôi. Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, đúng toán THPT Việt Nam. Khi có công thức, dùng LaTeX trong $...$ hoặc $$...$$. Nếu người dùng hỏi về câu hỏi/đề đang xem, hãy dựa vào ngữ cảnh sau nếu có:\n${ctx}`;
}

async function callOpenAICompatible({ url, key, model, messages, context }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt(context) }, ...messages],
      temperature: 0.3,
      max_tokens: 900,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `AI HTTP ${res.status}`);
  return data?.choices?.[0]?.message?.content || '';
}

async function callGemini({ key, model, messages, context }) {
  const contents = messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(context) }] },
      contents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Gemini HTTP ${res.status}`);
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
}

export default async function handler(req, res) {
  const list = providers();
  if (req.method === 'GET') {
    res.status(200).json({ enabled: list.length > 0, providers: list });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!list.length) {
    res.status(503).json({ error: 'AI chưa bật. Thầy đặt GROQ_API_KEY hoặc GEMINI_API_KEY trong Vercel rồi redeploy nhé.' });
    return;
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const hits = (rate.get(ip) || []).filter((t) => now - t < 60000);
  if (hits.length >= 20) {
    res.status(429).json({ error: 'AI đang bận vì gọi quá nhanh. Thầy chờ một chút rồi hỏi lại nhé.' });
    return;
  }
  hits.push(now);
  rate.set(ip, hits);

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const messages = cleanMessages(body.messages);
  if (!messages.length) {
    res.status(400).json({ error: 'Chưa có nội dung hỏi.' });
    return;
  }
  const context = body.context || '';
  const errors = [];
  for (const p of list) {
    try {
      let text = '';
      if (p === 'groq') {
        text = await callOpenAICompatible({
          url: 'https://api.groq.com/openai/v1/chat/completions',
          key: process.env.GROQ_API_KEY,
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages,
          context,
        });
      } else if (p === 'gemini') {
        const models = [...new Set([process.env.GEMINI_MODEL, 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash'].filter(Boolean))];
        let lastError = null;
        for (const model of models) {
          try {
            text = await callGemini({ key: process.env.GEMINI_API_KEY, model, messages, context });
            if (text.trim()) break;
          } catch (e) { lastError = e; }
        }
        if (!text.trim() && lastError) throw lastError;
      } else if (p === 'openai') {
        text = await callOpenAICompatible({
          url: 'https://api.openai.com/v1/chat/completions',
          key: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages,
          context,
        });
      } else if (p === 'openrouter') {
        text = await callOpenAICompatible({
          url: 'https://openrouter.ai/api/v1/chat/completions',
          key: process.env.OPENROUTER_API_KEY,
          model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
          messages,
          context,
        });
      }
      if (text.trim()) {
        res.status(200).json({ text: text.trim(), provider: p });
        return;
      }
      errors.push(`${p}: empty`);
    } catch (e) {
      errors.push(`${p}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  res.status(502).json({ error: `AI chưa trả lời được (${errors.join('; ')}).` });
}
