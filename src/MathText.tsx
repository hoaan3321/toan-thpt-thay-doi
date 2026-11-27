import katex from 'katex';
import 'katex/dist/katex.min.css';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMath(tex: string, displayMode: boolean): string {
  try {
    const clean = tex.replace(/\\hfill/g, '\\quad').replace(/\\displaystyle/g, '');
    return katex.renderToString(clean, { displayMode, throwOnError: false, strict: 'ignore' });
  } catch {
    return escapeHtml(tex);
  }
}

export function mathHtml(input: string): string {
  const text = input ?? '';
  const pattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([\s\S]+?\\\))/g;
  let out = '';
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    const idx = m.index ?? 0;
    out += escapeHtml(text.slice(last, idx)).replace(/\n/g, '<br/>');
    const raw = m[0];
    const display = raw.startsWith('$$') || raw.startsWith('\\[');
    const tex = raw.startsWith('$$')
      ? raw.slice(2, -2)
      : raw.startsWith('\\[')
        ? raw.slice(2, -2)
        : raw.startsWith('\\(')
          ? raw.slice(2, -2)
          : raw.slice(1, -1);
    out += renderMath(tex, display);
    last = idx + raw.length;
  }
  out += escapeHtml(text.slice(last)).replace(/\n/g, '<br/>');
  return out;
}

export default function MathText({ text }: { text: string }) {
  return <span dangerouslySetInnerHTML={{ __html: mathHtml(text) }} />;
}
