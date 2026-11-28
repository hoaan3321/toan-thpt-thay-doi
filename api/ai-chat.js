const rate = new Map();

function modelCatalog() {
  const cat = [];
  const add = (provider, model, label, vision = false) => cat.push({ id: `${provider}:${model}`, provider, model, label, vision });
  if (process.env.GROQ_API_KEY) {
    add('groq', 'llama-3.3-70b-versatile', 'Llama 3.3 70B (Groq)');
    add('groq', 'openai/gpt-oss-120b', 'GPT-OSS 120B (Groq)');
    add('groq', 'qwen/qwen3-32b', 'Qwen3 32B (Groq)');
    add('groq', 'meta-llama/llama-4-scout-17b-16e-instruct', 'Llama 4 Scout (Groq)', true);
    add('groq', 'openai/gpt-oss-20b', 'GPT-OSS 20B (Groq)');
    add('groq', 'llama-3.1-8b-instant', 'Llama 3.1 8B (Groq)');
  }
  if (process.env.CEREBRAS_API_KEY) {
    add('cerebras', 'gpt-oss-120b', 'GPT-OSS 120B (Cerebras)');
    add('cerebras', 'llama-3.3-70b', 'Llama 3.3 70B (Cerebras)');
    add('cerebras', 'qwen-3-32b', 'Qwen3 32B (Cerebras)');
    add('cerebras', 'llama3.1-8b', 'Llama 3.1 8B (Cerebras)');
  }
  if (process.env.GEMINI_API_KEY) {
    add('gemini', 'gemini-2.5-flash', 'Gemini 2.5 Flash', true);
    add('gemini', 'gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite', true);
    add('gemini', 'gemini-2.0-flash', 'Gemini 2.0 Flash', true);
    add('gemini', 'gemini-flash-lite-latest', 'Gemini Flash-Lite mới nhất', true);
  }
  if (process.env.OPENROUTER_API_KEY) {
    add('openrouter', 'openrouter/free', 'Tự chọn miễn phí (OpenRouter)');
    add('openrouter', 'meta-llama/llama-3.3-70b-instruct:free', 'Llama 3.3 70B (OpenRouter)');
    add('openrouter', 'deepseek/deepseek-r1:free', 'DeepSeek R1 (OpenRouter)');
    add('openrouter', 'qwen/qwen-2.5-72b-instruct:free', 'Qwen 2.5 72B (OpenRouter)');
    add('openrouter', 'google/gemini-2.0-flash-exp:free', 'Gemini 2.0 Flash (OpenRouter)', true);
    add('openrouter', 'mistralai/mistral-small-3.1-24b-instruct:free', 'Mistral Small 3.1 (OpenRouter)', true);
  }
  if (process.env.SAMBANOVA_API_KEY) {
    add('sambanova', 'Meta-Llama-3.3-70B-Instruct', 'Llama 3.3 70B (SambaNova)');
    add('sambanova', 'DeepSeek-R1', 'DeepSeek R1 (SambaNova)');
    add('sambanova', 'Meta-Llama-3.1-405B-Instruct', 'Llama 3.1 405B (SambaNova)');
  }
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
    add('cloudflare', '@cf/meta/llama-3.3-70b-instruct-fp8-fast', 'Llama 3.3 70B (Cloudflare)');
    add('cloudflare', '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', 'DeepSeek R1 32B (Cloudflare)');
    add('cloudflare', '@cf/meta/llama-3.1-8b-instruct', 'Llama 3.1 8B (Cloudflare)');
  }
  if (process.env.MISTRAL_API_KEY) {
    add('mistral', 'mistral-small-latest', 'Mistral Small');
    add('mistral', 'open-mistral-nemo', 'Mistral Nemo');
    add('mistral', 'ministral-8b-latest', 'Ministral 8B');
  }
  if (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY) {
    add('huggingface', 'meta-llama/Llama-3.3-70B-Instruct', 'Llama 3.3 70B (Hugging Face)');
    add('huggingface', 'Qwen/Qwen3-32B', 'Qwen3 32B (Hugging Face)');
    add('huggingface', 'deepseek-ai/DeepSeek-R1', 'DeepSeek R1 (Hugging Face)');
  }
  if (process.env.OPENAI_API_KEY) {
    add('openai', process.env.OPENAI_MODEL || 'gpt-4o-mini', 'GPT-4o mini (OpenAI)', true);
  }
  return cat;
}

function providers() {
  return [...new Set(modelCatalog().map((m) => m.provider))];
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-10).map((m) => ({
    role: m && m.role === 'assistant' ? 'assistant' : 'user',
    content: String((m && m.content) || '').slice(0, 4000),
  })).filter((m) => m.content.trim());
}

function cleanAiText(t) {
  return String(t || '')
    .replace(/\\hfill/g, '\\quad')
    .replace(/\\\[/g, '$$').replace(/\\\]/g, '$$')
    .replace(/\\\(/g, '$').replace(/\\\)/g, '$')
    .replace(/\$\s*\n\s*/g, '$').replace(/\s*\n\s*\$/g, '$');
}

function systemPrompt(context) {
  const ctx = String(context || '').slice(0, 6000);
  return `Bạn là trợ lý AI của app Toán Thầy Đôi - Love Math. Trả lời bằng tiếng Việt. Lời giải phải ngắn gọn, súc tích nhưng đầy đủ các bước chính, không lan man, không lặp ý; trình bày theo bước ngắn và kết luận đáp số rõ ràng. Mọi công thức phải nằm trong $...$ (công thức riêng dòng dùng $$...$$); chỉ dùng LaTeX đơn giản mà KaTeX hiển thị được, tuyệt đối không dùng \\hfill, không dùng ký tự toán Unicode rời rạc, không lặp lại công thức dạng chữ thường ngoài dấu $. Vectơ viết dạng $\\overrightarrow{OM}$, $\\vec{a}$. Nếu người dùng hỏi về câu hỏi/đề đang xem, hãy dựa vào ngữ cảnh sau nếu có:\n${ctx}`;
}

async function callOpenAICompatible({ url, key, model, messages, context, image }) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000),
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt(context) }, ...messages.map((m, i) => (image && i === messages.length - 1 && m.role === 'user'
        ? { role: 'user', content: [{ type: 'text', text: m.content }, { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.data}` } }] }
        : m))],
      temperature: 0.3,
      max_tokens: 900,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `AI HTTP ${res.status}`);
  return cleanAiText(data?.choices?.[0]?.message?.content || '');
}

async function callGemini({ key, model, messages, context, image }) {
  const contents = messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  if (image && contents.length) contents[contents.length - 1].parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { signal: AbortSignal.timeout(15000),
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
  return cleanAiText(data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '');
}

async function callCatalogModel(entry, messages, context, image) {
  const { provider, model } = entry;
  if (provider === 'gemini') return callGemini({ key: process.env.GEMINI_API_KEY, model, messages, context, image });
  const routes = {
    groq: { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY },
    cerebras: { url: 'https://api.cerebras.ai/v1/chat/completions', key: process.env.CEREBRAS_API_KEY },
    openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', key: process.env.OPENROUTER_API_KEY },
    sambanova: { url: 'https://api.sambanova.ai/v1/chat/completions', key: process.env.SAMBANOVA_API_KEY },
    cloudflare: { url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`, key: process.env.CLOUDFLARE_API_TOKEN },
    mistral: { url: 'https://api.mistral.ai/v1/chat/completions', key: process.env.MISTRAL_API_KEY },
    huggingface: { url: 'https://router.huggingface.co/v1/chat/completions', key: process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY },
    openai: { url: 'https://api.openai.com/v1/chat/completions', key: process.env.OPENAI_API_KEY },
  };
  const route = routes[provider];
  if (!route || !route.key) throw new Error('chưa có khóa');
  return callOpenAICompatible({ url: route.url, key: route.key, model, messages, context, image: entry.vision ? image : null });
}

export default async function handler(req, res) {
  const catalog = modelCatalog();
  const list = providers();
  if (req.method === 'GET') {
    res.status(200).json({ enabled: catalog.length > 0, providers: list, models: catalog.map(({ id, label, provider }) => ({ id, label, provider })) });
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
  let image = null;
  if (body.image && typeof body.image.data === 'string' && body.image.data.length <= 6000000) {
    image = { mimeType: String(body.image.mimeType || 'image/jpeg').slice(0, 50), data: body.image.data };
  }
  const errors = [];
  const wanted = typeof body.model === 'string' ? body.model : '';
  let ordered = [...catalog];
  if (image) ordered.sort((a, b) => Number(b.vision) - Number(a.vision));
  if (wanted && wanted !== 'auto') {
    const idx = ordered.findIndex((m) => m.id === wanted);
    if (idx > 0) ordered = [ordered[idx], ...ordered.filter((_, i) => i !== idx)];
  }
  for (const entry of ordered) {
    try {
      const text = await callCatalogModel(entry, messages, context, image);
      if (text.trim()) {
        res.status(200).json({ text: text.trim(), provider: entry.provider, model: entry.id, modelLabel: entry.label });
        return;
      }
      errors.push(`${entry.label}: empty`);
    } catch (e) {
      errors.push(`${entry.label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  res.status(502).json({ error: 'AI chưa trả lời được, thầy thử lại giúp em nhé.' });
}
