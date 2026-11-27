import { useEffect, useMemo, useState } from 'react';
import MathText from './MathText';
import { eqParams, getSession, ilike, isSupabaseConfigured, signIn, signOut, signUp, supabaseCount, supabaseDelete, supabaseGet, supabaseInsert, supabaseUpdate, type AuthSession } from './supabase';
import { LEVELS, QTYPES, QTYPE_LABEL, type Assignment, type ClassRecord, type ExamRecord, type Level, type QType, type Question, type StudentRecord, type Submission, type TheoryNote } from './types';

type Tab = 'overview' | 'bank' | 'theory' | 'english' | 'matrix' | 'print' | 'assign' | 'take' | 'results' | 'admin';

interface GeneratedCode {
  code: number;
  questions: Question[];
  rawPoints: number;
}

interface EnglishQuestion {
  id: number;
  grade: number;
  lesson: string;
  lesson_vi: string;
  dang: string;
  dang_vi: string;
  level: string;
  qtype: QType;
  title: string;
  problem: string;
  options: string[];
  answer: string;
  solution_en: string;
  solution_vi: string;
  vocabulary: { term: string; meaning: string }[];
  interesting: boolean;
}

interface Profile {
  user_id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  full_access: boolean;
  english_access: boolean;
  english_requested: boolean;
  trial_ends_at: string;
  created_at: string;
}

interface EnglishVocabulary { id: string; grade: number; lesson: string; lesson_vi: string; term: string; meaning: string; freq: number; }

const ENGLISH_LESSONS: Record<number, string[]> = {
  10: ['Mệnh đề','Tập hợp','Các phép toán trên tập hợp','Bất phương trình bậc nhất hai ẩn','Hệ bất phương trình bậc nhất hai ẩn','Giá trị lượng giác của một góc từ 0° đến 180°','Hệ thức lượng trong tam giác','Các khái niệm mở đầu','Tổng và hiệu của hai vectơ','Tích của một vectơ với một số','Vectơ trong mặt phẳng tọa độ','Tích vô hướng của hai vectơ','Số gần đúng và sai số','Các số đặc trưng đo xu thế trung tâm','Các số đặc trưng đo độ phân tán','Hàm số','Hàm số bậc hai','Dấu của tam thức bậc hai','Phương trình quy về phương trình bậc hai','Phương trình đường thẳng','Vị trí tương đối giữa hai đường thẳng. Góc và khoảng cách','Đường tròn trong mặt phẳng tọa độ','Ba đường conic','Quy tắc đếm','Hoán vị, chỉnh hợp và tổ hợp','Nhị thức Newton','Biến cố và định nghĩa cổ điển của xác suất','Thực hành tính xác suất theo định nghĩa cổ điển','Hệ phương trình bậc nhất ba ẩn','Phương pháp quy nạp toán học. Nhị thức Newton','Ba đường conic và ứng dụng'],
  11: ['Giá trị lượng giác của góc lượng giác','Công thức lượng giác','Hàm số lượng giác','Phương trình lượng giác','Dãy số','Cấp số cộng','Cấp số nhân','Mẫu số liệu ghép nhóm','Các số đặc trưng đo xu thế trung tâm cho mẫu số liệu ghép nhóm','Đường thẳng và mặt phẳng trong không gian','Hai đường thẳng song song','Đường thẳng song song với mặt phẳng','Hai mặt phẳng song song','Phép chiếu song song','Giới hạn của dãy số','Giới hạn của hàm số','Hàm số liên tục','Lũy thừa với số mũ thực','Lôgarit','Hàm số mũ và hàm số lôgarit','Phương trình, bất phương trình mũ và lôgarit','Hai đường thẳng vuông góc','Đường thẳng vuông góc với mặt phẳng','Phép chiếu vuông góc. Góc giữa đường thẳng và mặt phẳng','Hai mặt phẳng vuông góc','Khoảng cách','Thể tích','Biến cố hợp, biến cố giao, biến cố độc lập','Công thức cộng xác suất','Công thức nhân xác suất cho hai biến cố độc lập','Định nghĩa và ý nghĩa của đạo hàm','Các quy tắc tính đạo hàm','Đạo hàm cấp hai','Phép biến hình trong mặt phẳng','Làm quen với một vài khái niệm của lí thuyết đồ thị','Một số yếu tố vẽ kĩ thuật'],
  12: ['Tính đơn điệu và cực trị của hàm số','Giá trị lớn nhất và giá trị nhỏ nhất của hàm số','Đường tiệm cận của đồ thị hàm số','Khảo sát sự biến thiên và vẽ đồ thị của hàm số','Ứng dụng đạo hàm để giải quyết một số vấn đề liên quan đến thực tiễn','Vectơ trong không gian','Hệ trục tọa độ trong không gian','Biểu thức toạ độ của các phép toán vectơ','Khoảng biến thiên và khoảng tứ phân vị','Phương sai và độ lệch chuẩn','Nguyên hàm','Tích phân','Ứng dụng hình học của tích phân','Phương trình mặt phẳng','Phương trình đường thẳng trong không gian','Phương trình mặt cầu','Công thức tính góc trong không gian','Xác suất có điều kiện','Công thức xác suất toàn phần và công thức Bayes'],
};

function makeJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function normText(s: unknown): string {
  return String(s ?? '')
    .replace(/\$/g, '')
    .replace(/\\,/g, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .toLowerCase();
}

function stripOptionPrefix(s: string): string {
  return s.replace(/^\s*[A-D][.)]\s*/i, '').trim();
}

function stripSourcePrefix(s: string): string {
  return String(s ?? '').replace(/^\s*\[[^\]]{3,160}\]\s*/, '').trim();
}

function plainTextLen(s: string): number {
  return String(s ?? '').replace(/\\[a-zA-Z]+/g, 'x').replace(/[$\\{}^_]/g, '').trim().length;
}

function optionLayout(options: string[]): 4 | 2 | 1 {
  const lens = options.map((op) => plainTextLen(stripOptionPrefix(op)));
  const total = lens.reduce((a, b) => a + b, 0);
  if (options.length === 4 && Math.max(...lens) <= 14 && total <= 44) return 4;
  if (options.length >= 2 && Math.max(...lens) <= 30 && total <= 96) return 2;
  return 1;
}

function examDateTime(): string {
  const d = new Date();
  const pad = (v: number) => String(v).padStart(2, '0');
  return `Ngày ${pad(d.getDate())} tháng ${pad(d.getMonth() + 1)} năm ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtPoints(n: number): string {
  const v = Math.round(Number(n || 0) * 1000) / 1000;
  return String(v).replace('.', ',');
}

function gradeQuestion(q: Question, answer: unknown): { score: number; pending: boolean; note: string } {
  const points = Number(q.points || 0);
  if (q.qtype === 'essay') return { score: 0, pending: true, note: 'Tự luận chờ giáo viên chấm' };
  if (q.qtype === 'single') {
    const idx = Number(answer);
    if (!Number.isInteger(idx) || idx < 0) return { score: 0, pending: false, note: 'Chưa chọn đáp án' };
    const correct = q.correct.trim();
    const letter = correct.match(/^([A-D])[.)]/i)?.[1]?.toUpperCase();
    const selected = q.options?.[idx] ?? '';
    const ok = letter ? 'ABCD'[idx] === letter : normText(stripOptionPrefix(selected)) === normText(stripOptionPrefix(correct));
    return { score: ok ? points : 0, pending: false, note: ok ? 'Đúng' : 'Sai' };
  }
  if (q.qtype === 'tf') {
    const ans = (answer ?? {}) as Record<string, string>;
    const expected: Record<string, boolean> = {};
    for (const m of q.correct.matchAll(/([a-d])\)\s*(Đúng|Sai)/gi)) expected[m[1].toLowerCase()] = m[2].toLowerCase() === 'đúng';
    let right = 0;
    for (const k of ['a', 'b', 'c', 'd']) if (ans[k] && (ans[k] === 'Đúng') === expected[k]) right++;
    const scale = [0, 0.1, 0.25, 0.5, 1][right] ?? 0;
    return { score: points * scale, pending: false, note: `${right}/4 ý đúng` };
  }
  const got = normText(answer);
  const want = normText(q.correct);
  const gotNum = Number(got);
  const wantNum = Number(want);
  const ok = got !== '' && (got === want || (Number.isFinite(gotNum) && Number.isFinite(wantNum) && Math.abs(gotNum - wantNum) < 1e-9));
  return { score: ok ? points : 0, pending: false, note: ok ? 'Đúng' : 'Sai' };
}

function downloadText(filename: string, text: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadBlob(filename: string, blob: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function latexToText(input: string): string {
  let s = String(input ?? '');
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, '$1').replace(/\$([^$]*)\$/g, '$1').replace(/\\\(([\s\S]*?)\\\)/g, '$1').replace(/\\\[([\s\S]*?)\\\]/g, '$1');
  s = s.replace(/\\dfrac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)').replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)').replace(/\\sqrt\s*([0-9a-zA-Z])/g, '√$1');
  const symbols: Record<string, string> = { '\\pi': 'π', '\\infty': '∞', '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\Delta': 'Δ', '\\delta': 'δ', '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ', '\\sigma': 'σ', '\\phi': 'φ', '\\omega': 'ω', '\\le': '≤', '\\ge': '≥', '\\ne': '≠', '\\neq': '≠', '\\approx': '≈', '\\times': '×', '\\cdot': '·', '\\pm': '±', '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\cup': '∪', '\\cap': '∩', '\\rightarrow': '→', '\\Rightarrow': '⇒', '\\Leftrightarrow': '⇔', '\\angle': '∠', '\\perp': '⊥', '\\parallel': '∥', '\\triangle': '△', '\\emptyset': '∅', '\\mathbb{R}': 'ℝ', '\\mathbb{Z}': 'ℤ', '\\mathbb{N}': 'ℕ', '\\mathbb{Q}': 'ℚ' };
  for (const [k, v] of Object.entries(symbols)) s = s.split(k).join(v);
  s = s.replace(/\\text\{([^{}]*)\}/g, '$1').replace(/\\mathrm\{([^{}]*)\}/g, '$1').replace(/\\left|\\right/g, '').replace(/\\,/g, ' ').replace(/\\;/g, ' ').replace(/\\ /g, ' ');
  s = s.replace(/\^\{([^{}]+)\}/g, '^$1').replace(/_\{([^{}]+)\}/g, '_$1').replace(/\\[a-zA-Z]+/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

const MATH_SYMBOLS: Record<string, string> = {
  pi: 'π', infty: '∞', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', theta: 'θ', lambda: 'λ', mu: 'μ', sigma: 'σ', phi: 'φ', varphi: 'φ', omega: 'ω', Omega: 'Ω', epsilon: 'ε', varepsilon: 'ε', rho: 'ρ', tau: 'τ', xi: 'ξ', eta: 'η', kappa: 'κ', nu: 'ν', psi: 'ψ', chi: 'χ', zeta: 'ζ',
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', times: '×', cdot: '·', pm: '±', mp: '∓', div: '÷', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃', cup: '∪', cap: '∩', setminus: '∖', emptyset: '∅', varnothing: '∅',
  rightarrow: '→', to: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', iff: '⇔', implies: '⇒', mapsto: '↦', angle: '∠', perp: '⊥', parallel: '∥', triangle: '△', sim: '∼', simeq: '≃', cong: '≅', equiv: '≡', propto: '∝', forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨', mid: '∣', nmid: '∤', prime: '′', circ: '∘', bullet: '•', cdots: '⋯', ldots: '…', dots: '…', vdots: '⋮', ddots: '⋱', degree: '°', circled: '°',
};
const MATH_FUNCS = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'ln', 'log', 'exp', 'lim', 'min', 'max', 'sup', 'inf', 'det', 'gcd', 'lcm', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'mod']);

function mRun(text: string, upright = false): string {
  if (!text) return '';
  return `<m:r>${upright ? '<m:rPr><m:sty m:val="p"/></m:rPr>' : ''}<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr><m:t xml:space="preserve">${xmlEscape(text)}</m:t></m:r>`;
}

function latexToOmml(input: string): string {
  const s = String(input ?? '');
  let i = 0;
  const peek = () => s[i] ?? '';
  function readGroup(): string {
    if (peek() !== '{') return parsePrimary();
    i++;
    let out = '';
    while (i < s.length && peek() !== '}') out += parseTerm();
    if (peek() === '}') i++;
    return out;
  }
  function readBracket(): string {
    if (peek() !== '[') return '';
    i++;
    let out = '';
    while (i < s.length && peek() !== ']') out += parseTerm();
    if (peek() === ']') i++;
    return out;
  }
  function parsePrimary(): string {
    const ch = peek();
    if (!ch) return '';
    if (ch === '{') return readGroup();
    if (ch === '\\') {
      i++;
      const m = /^[a-zA-Z]+/.exec(s.slice(i));
      if (!m) { const c = s[i] ?? ''; i++; return mRun(c === ',' || c === ';' || c === ' ' ? ' ' : c); }
      const cmd = m[0];
      i += cmd.length;
      if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') { const num = readGroup(); const den = readGroup(); return `<m:f><m:fPr><m:type m:val="bar"/></m:fPr><m:num>${num}</m:num><m:den>${den}</m:den></m:f>`; }
      if (cmd === 'sqrt') { const deg = readBracket(); const e = readGroup(); return `<m:rad><m:radPr>${deg ? '' : '<m:degHide m:val="1"/>'}</m:radPr><m:deg>${deg}</m:deg><m:e>${e}</m:e></m:rad>`; }
      if (cmd === 'sum' || cmd === 'prod' || cmd === 'int' || cmd === 'iint' || cmd === 'oint') {
        const chr = cmd === 'sum' ? '∑' : cmd === 'prod' ? '∏' : cmd === 'oint' ? '∮' : cmd === 'iint' ? '∬' : '∫';
        let sub = ''; let sup = '';
        for (let k = 0; k < 2; k++) { if (peek() === '_') { i++; sub = readGroup(); } else if (peek() === '^') { i++; sup = readGroup(); } }
        const e = i < s.length && peek() !== '}' ? parseTerm() : '';
        return `<m:nary><m:naryPr><m:chr m:val="${chr}"/><m:limLoc m:val="subSup"/><m:grow m:val="1"/></m:naryPr><m:sub>${sub}</m:sub><m:sup>${sup}</m:sup><m:e>${e}</m:e></m:nary>`;
      }
      if (cmd === 'left') {
        const open = s[i] ?? ''; i++;
        let inner = '';
        while (i < s.length && !s.startsWith('\\right', i)) inner += parseTerm();
        if (s.startsWith('\\right', i)) i += 6;
        const close = s[i] ?? ''; i++;
        const beg = open === '(' ? '(' : open === '[' ? '[' : open === '{' ? '{' : open === '|' ? '|' : '';
        const end = close === ')' ? ')' : close === ']' ? ']' : close === '}' ? '}' : close === '|' ? '|' : '';
        return `<m:d><m:dPr>${beg ? `<m:begChr m:val="${beg}"/>` : '<m:begChr m:val=""/>' }${end ? `<m:endChr m:val="${end}"/>` : '<m:endChr m:val=""/>'}</m:dPr><m:e>${inner}</m:e></m:d>`;
      }
      if (cmd === 'begin') {
        const env = readGroup().replace(/<[^>]+>/g, '');
        const endMark = `\\end{${env}}`;
        const start = i;
        const endIdx = s.indexOf(endMark, i);
        const raw = endIdx >= 0 ? s.slice(start, endIdx) : s.slice(start);
        i = endIdx >= 0 ? endIdx + endMark.length : s.length;
        const rows = raw.split(/\\\\/).map((r) => r.trim()).filter(Boolean);
        if (env === 'cases') {
          const eqRows = rows.map((r) => `<m:e>${latexToOmmlInner(r)}</m:e>`).join('');
          return `<m:d><m:dPr><m:begChr m:val="{"/><m:endChr m:val=""/></m:dPr><m:e><m:eqArr>${eqRows}</m:eqArr></m:e></m:d>`;
        }
        const mRows = rows.map((r) => `<m:mr>${r.split('&').map((c) => `<m:e>${latexToOmmlInner(c.trim())}</m:e>`).join('')}</m:mr>`).join('');
        const matrix = `<m:m>${mRows}</m:m>`;
        if (env === 'pmatrix') return `<m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e>${matrix}</m:e></m:d>`;
        if (env === 'bmatrix') return `<m:d><m:dPr><m:begChr m:val="["/><m:endChr m:val="]"/></m:dPr><m:e>${matrix}</m:e></m:d>`;
        if (env === 'vmatrix') return `<m:d><m:dPr><m:begChr m:val="|"/><m:endChr m:val="|"/></m:dPr><m:e>${matrix}</m:e></m:d>`;
        return matrix;
      }
      if (cmd === 'text' || cmd === 'mathrm' || cmd === 'textbf' || cmd === 'textit') {
        const start = i;
        if (peek() === '{') { let depth = 0; let j = i; while (j < s.length) { if (s[j] === '{') depth++; if (s[j] === '}') { depth--; if (!depth) break; } j++; } const raw = s.slice(start + 1, j); i = j + 1; return mRun(raw, true); }
        return '';
      }
      if (cmd === 'mathbb') { const g = readGroup().replace(/<[^>]+>/g, ''); const map: Record<string, string> = { R: 'ℝ', Z: 'ℤ', N: 'ℕ', Q: 'ℚ', C: 'ℂ' }; return mRun(map[g] ?? g, true); }
      if (cmd === 'overline' || cmd === 'bar') return `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>${readGroup()}</m:e></m:bar>`;
      if (cmd === 'underline') return `<m:bar><m:barPr><m:pos m:val="bot"/></m:barPr><m:e>${readGroup()}</m:e></m:bar>`;
      if (cmd === 'hat') return `<m:acc><m:accPr><m:chr m:val="̂"/></m:accPr><m:e>${readGroup()}</m:e></m:acc>`;
      if (cmd === 'vec') return `<m:acc><m:accPr><m:chr m:val="⃗"/></m:accPr><m:e>${readGroup()}</m:e></m:acc>`;
      if (cmd === 'tilde') return `<m:acc><m:accPr><m:chr m:val="̃"/></m:accPr><m:e>${readGroup()}</m:e></m:acc>`;
      if (cmd === 'dot') return `<m:acc><m:accPr><m:chr m:val="̇"/></m:accPr><m:e>${readGroup()}</m:e></m:acc>`;
      if (cmd === 'lim') { let sub = ''; if (peek() === '_') { i++; sub = readGroup(); } return sub ? `<m:sSub><m:e>${mRun('lim', true)}</m:e><m:sub>${sub}</m:sub></m:sSub>` : mRun('lim', true); }
      if (MATH_FUNCS.has(cmd)) return mRun(cmd, true);
      if (MATH_SYMBOLS[cmd]) return mRun(MATH_SYMBOLS[cmd]);
      if (cmd === 'quad' || cmd === 'qquad') return mRun('  ');
      if (peek() === '{') return readGroup();
      return '';
    }
    if (ch === '^' || ch === '_' || ch === '}') return '';
    i++;
    if (/[0-9]/.test(ch)) {
      let num = ch;
      while (/[0-9.,]/.test(peek())) { num += s[i]; i++; }
      return mRun(num);
    }
    return mRun(ch);
  }
  function parseTerm(): string {
    let base = parsePrimary();
    if (!base) { if (i < s.length && peek() !== '}') i++; return ''; }
    let sub = ''; let sup = '';
    for (let k = 0; k < 2; k++) {
      if (peek() === '^') { i++; sup = readGroup(); }
      else if (peek() === '_') { i++; sub = readGroup(); }
    }
    if (sub && sup) return `<m:sSubSup><m:e>${base}</m:e><m:sub>${sub}</m:sub><m:sup>${sup}</m:sup></m:sSubSup>`;
    if (sup) return `<m:sSup><m:e>${base}</m:e><m:sup>${sup}</m:sup></m:sSup>`;
    if (sub) return `<m:sSub><m:e>${base}</m:e><m:sub>${sub}</m:sub></m:sSub>`;
    return base;
  }
  let out = '';
  while (i < s.length) out += parseTerm();
  return out;
}

function latexToOmmlInner(s: string): string {
  return latexToOmml(s);
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (v: number) => new Uint8Array([v & 255, (v >>> 8) & 255]);
  const u32 = (v: number) => new Uint8Array([v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]);
  const join = (parts: Uint8Array[]) => { const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = join([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(f.data.length), u32(f.data.length), u16(name.length), u16(0), name, f.data]);
    chunks.push(local);
    central.push(join([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(f.data.length), u32(f.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += local.length;
  }
  const centralBytes = join(central);
  const end = join([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralBytes.length), u32(offset), u16(0)]);
  return new Blob([join([...chunks, centralBytes, end]) as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class Dinic {
  graph: { to: number; rev: number; cap: number }[][];
  level: number[] = [];
  it: number[] = [];
  constructor(n: number) {
    this.graph = Array.from({ length: n }, () => []);
  }
  addEdge(fr: number, to: number, cap: number) {
    const fwd = { to, rev: this.graph[to].length, cap };
    const rev = { to: fr, rev: this.graph[fr].length, cap: 0 };
    this.graph[fr].push(fwd);
    this.graph[to].push(rev);
  }
  bfs(s: number, t: number): boolean {
    this.level = Array(this.graph.length).fill(-1);
    const q = [s];
    this.level[s] = 0;
    while (q.length) {
      const v = q.shift()!;
      for (const e of this.graph[v]) {
        if (e.cap > 0 && this.level[e.to] < 0) {
          this.level[e.to] = this.level[v] + 1;
          q.push(e.to);
        }
      }
    }
    return this.level[t] >= 0;
  }
  dfs(v: number, t: number, f: number): number {
    if (v === t) return f;
    for (let i = this.it[v]; i < this.graph[v].length; i++) {
      this.it[v] = i;
      const e = this.graph[v][i];
      if (e.cap > 0 && this.level[v] < this.level[e.to]) {
        const d = this.dfs(e.to, t, Math.min(f, e.cap));
        if (d > 0) {
          e.cap -= d;
          this.graph[e.to][e.rev].cap += d;
          return d;
        }
      }
    }
    return 0;
  }
  maxflow(s: number, t: number): number {
    let flow = 0;
    while (this.bfs(s, t)) {
      this.it = Array(this.graph.length).fill(0);
      let f: number;
      while ((f = this.dfs(s, t, Number.MAX_SAFE_INTEGER)) > 0) flow += f;
    }
    return flow;
  }
}

function buildCellCounts(
  levelNeed: Record<Level, number>,
  partNeed: Record<QType, number>,
  capacity: Record<Level, Record<QType, number>>,
): Record<Level, Record<QType, number>> | null {
  const totalLevel = LEVELS.reduce((s, l) => s + levelNeed[l], 0);
  const totalPart = QTYPES.reduce((s, q) => s + partNeed[q], 0);
  if (totalLevel !== totalPart) return null;
  const SRC = 0;
  const levelNode = (i: number) => 1 + i;
  const partNode = (j: number) => 5 + j;
  const SNK = 9;
  const dinic = new Dinic(10);
  LEVELS.forEach((l, i) => dinic.addEdge(SRC, levelNode(i), levelNeed[l]));
  QTYPES.forEach((q, j) => dinic.addEdge(partNode(j), SNK, partNeed[q]));
  const edgeIndex: Record<string, number> = {};
  LEVELS.forEach((l, i) => {
    QTYPES.forEach((q, j) => {
      edgeIndex[`${l}|${q}`] = dinic.graph[levelNode(i)].length;
      dinic.addEdge(levelNode(i), partNode(j), capacity[l][q]);
    });
  });
  const flow = dinic.maxflow(SRC, SNK);
  if (flow !== totalLevel) return null;
  const out = {} as Record<Level, Record<QType, number>>;
  LEVELS.forEach((l, i) => {
    out[l] = {} as Record<QType, number>;
    QTYPES.forEach((q) => {
      const e = dinic.graph[levelNode(i)][edgeIndex[`${l}|${q}`]];
      out[l][q] = capacity[l][q] - e.cap;
    });
  });
  return out;
}

function AppClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const pad = (v: number) => String(v).padStart(2, '0');
  const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  return <p className="app-clock">🕒 {weekdays[now.getDay()]}, ngày {pad(now.getDate())} tháng {pad(now.getMonth() + 1)} năm {now.getFullYear()} · {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}</p>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [overview, setOverview] = useState<{ total: number; theory: number; byGrade: Record<string, number>; byLevel: Record<string, number>; byType: Record<string, number> } | null>(null);

  const [grade, setGrade] = useState(12);
  const [chapter, setChapter] = useState('');
  const [dang, setDang] = useState('');
  const [level, setLevel] = useState('');
  const [qtype, setQtype] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [bankTotal, setBankTotal] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);
  const pageSize = 20;

  const [theoryGrade, setTheoryGrade] = useState(12);
  const [theory, setTheory] = useState<TheoryNote[]>([]);

  const [englishGrade, setEnglishGrade] = useState<'all' | 10 | 11 | 12>('all');
  const [englishLevel, setEnglishLevel] = useState('');
  const [englishLesson, setEnglishLesson] = useState('');
  const [englishDang, setEnglishDang] = useState('');
  const [englishSearch, setEnglishSearch] = useState('');
  const [englishOnlyInteresting, setEnglishOnlyInteresting] = useState(false);
  const [englishShowAllSolutions, setEnglishShowAllSolutions] = useState(false);
  const [englishOpenId, setEnglishOpenId] = useState<number | null>(null);
  const [englishQuestions, setEnglishQuestions] = useState<EnglishQuestion[]>([]);
  const [englishTotal, setEnglishTotal] = useState(0);
  const [englishTotalAll, setEnglishTotalAll] = useState(0);
  const [englishPage, setEnglishPage] = useState(0);
  const [englishDangOptions, setEnglishDangOptions] = useState<string[]>([]);
  const [englishMode, setEnglishMode] = useState<'problems' | 'vocab'>('problems');
  const [vocabRows, setVocabRows] = useState<EnglishVocabulary[]>([]);
  const [vocabTotal, setVocabTotal] = useState(0);
  const [vocabPage, setVocabPage] = useState(0);
  const [mastered, setMastered] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem('english-vocab-mastered') ?? '[]') as string[]); } catch { return new Set(); } });

  const [mGrade, setMGrade] = useState(12);
  const [scopeMode, setScopeMode] = useState<'all' | 'chapter' | 'lesson'>('all');
  const [mChapter, setMChapter] = useState('');
  const [mLesson, setMLesson] = useState('');
  const [scopeChapters, setScopeChapters] = useState<{ name: string; count: number }[]>([]);
  const [scopeLessons, setScopeLessons] = useState<{ name: string; base: string; count: number }[]>([]);
  const [numCodes, setNumCodes] = useState(4);
  const [levelNeed, setLevelNeed] = useState<Record<Level, number>>({ NB: 7, TH: 7, VD: 6, VDC: 4 });
  const [partNeed, setPartNeed] = useState<Record<QType, number>>({ single: 12, tf: 4, short: 4, essay: 4 });
  const [partPoints, setPartPoints] = useState<Record<QType, number>>({ single: 3, tf: 3, short: 2, essay: 2 });
  const [generated, setGenerated] = useState<GeneratedCode[]>([]);
  const [matrixMsg, setMatrixMsg] = useState('');
  const [session, setSession] = useState<AuthSession | null>(() => getSession());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authRole, setAuthRole] = useState<'student' | 'teacher'>('student');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [examTitle, setExamTitle] = useState('Đề Toán THPT');
  const [duration, setDuration] = useState(45);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [className, setClassName] = useState('');
  const [classGrade, setClassGrade] = useState(12);
  const [studentNames, setStudentNames] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [takeClassName, setTakeClassName] = useState('');
  const [takeAssignment, setTakeAssignment] = useState<Assignment | null>(null);
  const [takeExam, setTakeExam] = useState<ExamRecord | null>(null);
  const [takeQuestions, setTakeQuestions] = useState<Question[]>([]);
  const [takeCodeIndex, setTakeCodeIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [takeResult, setTakeResult] = useState('');
  const [resultAssignmentId, setResultAssignmentId] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [essayScores, setEssayScores] = useState<Record<string, string>>({});
  const [adminForm, setAdminForm] = useState({ id: '', grade: 12, chapter: '', dang: '', level: 'NB', qtype: 'single', content: '', options: '', correct: '', explanation: '', points: 0.25 });
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState('Đang kiểm tra AI…');
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([{ role: 'assistant', content: 'Thầy hỏi em về bài toán, cách tạo đề hoặc câu đang xem nhé.' }]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const bankParams = useMemo(() => {
    const p = eqParams({ grade, level: level || undefined, qtype: qtype || undefined });
    if (chapter.trim()) p.set('chapter', ilike(chapter.trim()));
    if (dang.trim()) p.set('dang', ilike(dang.trim()));
    if (search.trim()) {
      const s = search.trim().replace(/[%*,()]/g, ' ');
      p.set('or', `(content.ilike.*${s}*,correct.ilike.*${s}*,explanation.ilike.*${s}*,dang.ilike.*${s}*,chapter.ilike.*${s}*)`);
    }
    return p;
  }, [grade, chapter, dang, level, qtype, search]);

  const englishLessons = englishGrade === 'all' ? [...ENGLISH_LESSONS[10], ...ENGLISH_LESSONS[11], ...ENGLISH_LESSONS[12]] : ENGLISH_LESSONS[englishGrade];
  const englishParams = useMemo(() => {
    const p = eqParams({ grade: englishGrade === 'all' ? undefined : englishGrade, level: englishLevel || undefined, lesson_vi: englishLesson || undefined, dang_vi: englishDang || undefined, interesting: englishOnlyInteresting ? 'true' : undefined });
    if (englishSearch.trim()) {
      const q = englishSearch.trim().replace(/[%*,()]/g, ' ');
      p.set('or', `(title.ilike.*${q}*,problem.ilike.*${q}*,answer.ilike.*${q}*,solution_en.ilike.*${q}*,solution_vi.ilike.*${q}*,dang.ilike.*${q}*,dang_vi.ilike.*${q}*,lesson.ilike.*${q}*,lesson_vi.ilike.*${q}*)`);
    }
    return p;
  }, [englishGrade, englishLevel, englishLesson, englishDang, englishOnlyInteresting, englishSearch]);

  const inTrial = Boolean(profile && new Date(profile.trial_ends_at).getTime() > Date.now());
  const isAdmin = profile?.role === 'admin';
  const isTeacher = profile?.role === 'teacher' || isAdmin;
  const hasFull = Boolean(isAdmin || profile?.full_access || inTrial);
  const hasEnglish = Boolean(isAdmin || profile?.english_access || profile?.full_access || inTrial);
  const canTeach = Boolean(isTeacher && hasFull);

  async function loadProfile() {
    if (!isSupabaseConfigured || !session?.user?.id) { setProfile(null); return; }
    try {
      const p = eqParams({ user_id: session.user.id });
      p.set('select', '*');
      const rows = await supabaseGet<Profile[]>('profiles', p, true);
      setProfile(rows[0] ?? null);
    } catch { setProfile(null); }
  }

  async function loadProfiles() {
    if (!isSupabaseConfigured || !isAdmin) return;
    try {
      const p = new URLSearchParams({ select: '*', order: 'created_at.asc', limit: '500' });
      setProfiles(await supabaseGet<Profile[]>('profiles', p, true));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  async function updateProfile(userId: string, patch: Partial<Profile>) {
    try {
      await supabaseUpdate('profiles', eqParams({ user_id: userId }), patch, true);
      await loadProfiles();
      if (userId === session?.user?.id) await loadProfile();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  async function requestEnglish() {
    if (!session?.user?.id) return;
    await updateProfile(session.user.id, { english_requested: true });
    setMatrixMsg('Đã gửi yêu cầu cấp quyền Toán tiếng Anh tới quản trị.');
  }

  async function loadVocab(nextPage = vocabPage) {
    if (!isSupabaseConfigured || !hasEnglish) return;
    setLoading(true); setError('');
    try {
      const p = eqParams({ grade: englishGrade === 'all' ? undefined : englishGrade, lesson_vi: englishLesson || undefined });
      if (englishSearch.trim()) { const q = englishSearch.trim().replace(/[%*,()]/g, ' '); p.set('or', `(term.ilike.*${q}*,meaning.ilike.*${q}*,lesson_vi.ilike.*${q}*)`); }
      setVocabTotal(await supabaseCount('english_vocabulary', p, true));
      p.set('select', '*'); p.set('order', 'freq.desc,term.asc'); p.set('limit', String(pageSize)); p.set('offset', String(nextPage * pageSize));
      setVocabRows(await supabaseGet<EnglishVocabulary[]>('english_vocabulary', p, true));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  function toggleMastered(id: string) {
    setMastered((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); localStorage.setItem('english-vocab-mastered', JSON.stringify(Array.from(next))); return next; });
  }

  async function loadEnglish(nextPage = englishPage) {
    if (!isSupabaseConfigured) return;
    setLoading(true); setError('');
    try {
      const total = await supabaseCount('english_questions', englishParams, true);
      setEnglishTotal(total);
      const p = new URLSearchParams(englishParams);
      p.set('select', '*');
      p.set('order', 'id.asc');
      p.set('limit', String(pageSize));
      p.set('offset', String(nextPage * pageSize));
      setEnglishQuestions(await supabaseGet<EnglishQuestion[]>('english_questions', p, true));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function loadEnglishDangs() {
    if (!isSupabaseConfigured || !englishLesson) { setEnglishDangOptions([]); return; }
    try {
      const p = eqParams({ grade: englishGrade === 'all' ? undefined : englishGrade, lesson_vi: englishLesson });
      p.set('select', 'dang_vi');
      p.set('order', 'dang_vi.asc');
      p.set('limit', '5000');
      const rows = await supabaseGet<{ dang_vi: string }[]>('english_questions', p, true);
      setEnglishDangOptions(Array.from(new Set(rows.map((r) => r.dang_vi))).sort());
    } catch { setEnglishDangOptions([]); }
  }

  async function pickRandomEnglishProblem() {
    if (!isSupabaseConfigured) return;
    try {
      const total = await supabaseCount('english_questions', englishParams, true);
      if (!total) return;
      const offset = Math.floor(Math.random() * total);
      const p = new URLSearchParams(englishParams);
      p.set('select', '*');
      p.set('order', 'id.asc');
      p.set('limit', '1');
      p.set('offset', String(offset));
      const rows = await supabaseGet<EnglishQuestion[]>('english_questions', p, true);
      if (rows[0]) { setEnglishQuestions(rows); setEnglishTotal(total); setEnglishPage(0); setEnglishOpenId(rows[0].id); }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  async function loadOverview() {
    if (!isSupabaseConfigured) return;
    setLoading(true); setError('');
    try {
      const [total, theoryTotal, englishTotalCount] = await Promise.all([
        supabaseCount('questions', new URLSearchParams()),
        supabaseCount('theory_notes', new URLSearchParams()),
        supabaseCount('english_questions', new URLSearchParams(), Boolean(getSession())).catch(() => 0),
      ]);
      setEnglishTotalAll(englishTotalCount);
      const byGrade: Record<string, number> = {};
      const byLevel: Record<string, number> = {};
      const byType: Record<string, number> = {};
      for (const g of [10, 11, 12]) byGrade[g] = await supabaseCount('questions', eqParams({ grade: g }));
      for (const l of LEVELS) byLevel[l] = await supabaseCount('questions', eqParams({ level: l }));
      for (const q of QTYPES) byType[q] = await supabaseCount('questions', eqParams({ qtype: q }));
      setOverview({ total, theory: theoryTotal, byGrade, byLevel, byType });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function loadBank(nextPage = page) {
    if (!isSupabaseConfigured) return;
    setLoading(true); setError('');
    try {
      const total = await supabaseCount('questions', bankParams);
      setBankTotal(total);
      const p = new URLSearchParams(bankParams);
      p.set('select', '*');
      p.set('order', 'id.asc');
      p.set('limit', String(pageSize));
      p.set('offset', String(nextPage * pageSize));
      setQuestions(await supabaseGet<Question[]>('questions', p));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function loadTheory() {
    if (!isSupabaseConfigured) return;
    setLoading(true); setError('');
    try {
      const p = eqParams({ grade: theoryGrade });
      p.set('select', '*');
      p.set('order', 'order_index.asc,id.asc');
      setTheory(await supabaseGet<TheoryNote[]>('theory_notes', p));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function baseChapter(chapter: string): string {
    return chapter.split(' — ')[0].trim();
  }

  function normalizeText(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function lessonTitle(chapter: string): string {
    const part = chapter.split(' — ')[1] ?? '';
    return part.replace(/^§\d+\.\s*/, '').trim();
  }

  function lessonKey(chapter: string): string {
    return `${baseChapter(chapter)}|${normalizeText(lessonTitle(chapter))}`;
  }

  function lessonScore(q: { chapter: string; dang?: string; content?: string }, selectedLesson: string): number {
    if (lessonKey(q.chapter) === lessonKey(selectedLesson)) return 100;
    if (baseChapter(q.chapter) !== baseChapter(selectedLesson)) return 0;
    const title = normalizeText(lessonTitle(selectedLesson));
    const dang = normalizeText(q.dang ?? '');
    const text = normalizeText(`${q.dang ?? ''} ${q.content ?? ''}`);
    if (!title || !text) return 0;
    let score = 0;
    if (dang.includes(title)) score += 12;
    else if (text.includes(title)) score += 8;
    const tokens = title.split(' ').filter((t) => t.length >= 3 && !['cua', 'trong', 'va', 'hai', 'mot', 'cac', 'bai', 'tap', 'cuoi', 'chuong', 'on'].includes(t));
    const bigrams = tokens.slice(0, -1).map((t, i) => `${t} ${tokens[i + 1]}`);
    for (const b of bigrams) { if (dang.includes(b)) score += 4; else if (text.includes(b)) score += 2; }
    for (const t of tokens) { if (t.length >= 5 && dang.includes(t)) score += 1; }
    const has = (s: string) => dang.includes(s) || text.includes(s);
    if (title.includes('toa do') && has('toa do')) score += 6;
    if (title.includes('tich vo huong') && has('tich vo huong')) score += 8;
    if (title.includes('tich vo huong') && has('goc giua hai vecto')) score += 5;
    if (title.includes('tong va hieu') && (has('tong') || has('hieu') || has('quy tac ba diem') || has('quy tac hinh binh hanh') || has('vecto doi'))) score += 6;
    if (title.includes('tich cua mot vecto') && (has('cung phuong') || has('trung diem') || has('trong tam') || has('phan tich vecto') || has('bieu dien vecto') || has('diem thoa man dang thuc'))) score += 6;
    if (title.includes('khai niem mo dau') && (has('phuong huong') || has('do dai') || has('bang nhau') || has('khai niem'))) score += 6;
    if (title.includes('cap so cong') && has('cap so cong')) score += 8;
    if (title.includes('cap so nhan') && has('cap so nhan')) score += 8;
    if (title.includes('gioi han') && has('gioi han')) score += 6;
    if (title.includes('lien tuc') && has('lien tuc')) score += 6;
    if (title.includes('dao ham') && has('dao ham')) score += 6;
    if (title.includes('nguyen ham') && has('nguyen ham')) score += 8;
    if (title.includes('tich phan') && has('tich phan')) score += 8;
    if (title.includes('xac suat') && has('xac suat')) score += 6;
    if (title.includes('song song') && has('song song')) score += 6;
    if (title.includes('vuong goc') && has('vuong goc')) score += 6;
    if (title.includes('mat phang') && has('mat phang')) score += 4;
    if (title.includes('duong thang') && has('duong thang')) score += 4;
    if (title.includes('mat cau') && has('mat cau')) score += 8;
    if (title.includes('logarit') && (has('logarit') || has('log '))) score += 6;
    if (title.includes('ham so mu') && has('mu')) score += 4;
    if (title.includes('luong giac') && has('luong giac')) score += 6;
    if (title.includes('tap hop') && has('tap hop')) score += 6;
    if (title.includes('menh de') && has('menh de')) score += 6;
    return score;
  }

  function classifyLesson(q: { chapter: string; dang?: string; content?: string }, candidates: string[]): string {
    let best = '';
    let bestScore = 0;
    for (const c of candidates) {
      const s = lessonScore(q, c);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return bestScore >= 4 ? best : '';
  }

  function lessonMatches(q: { chapter: string; dang?: string; content?: string }, selectedLesson: string, candidates?: string[]): boolean {
    if (!selectedLesson) return false;
    if (candidates && candidates.length) return classifyLesson(q, candidates) === selectedLesson;
    return lessonScore(q, selectedLesson) >= 4;
  }

  async function loadScopes(gradeValue = mGrade) {
    if (!isSupabaseConfigured) return;
    try {
      const counts = new Map<string, number>();
      const scopeRows: { chapter: string; lesson?: string; dang: string }[] = [];
      const limit = 1000;
      for (let offset = 0; ; offset += limit) {
        const p = eqParams({ grade: gradeValue });
        p.set('select', 'chapter,lesson,dang');
        p.set('order', 'id.asc');
        p.set('limit', String(limit));
        p.set('offset', String(offset));
        const rows = await supabaseGet<{ chapter: string; lesson?: string; dang: string }[]>('questions', p);
        scopeRows.push(...rows);
        for (const r of rows) counts.set(r.chapter, (counts.get(r.chapter) ?? 0) + 1);
        if (rows.length < limit) break;
      }
      const chapterMap = new Map<string, number>();
      const lessonMap = new Map<string, { name: string; base: string; count: number }>();
      for (const [name, count] of counts.entries()) {
        const base = baseChapter(name);
        chapterMap.set(base, (chapterMap.get(base) ?? 0) + count);
        if (name.includes(' — ')) {
          const key = lessonKey(name);
          const display = `${base} — ${lessonTitle(name)}`;
          if (!lessonMap.has(key)) lessonMap.set(key, { name: display, base, count: 0 });
        }
      }
      for (const r of scopeRows) {
        const base = baseChapter(r.chapter);
        const lessonName = (r.lesson ?? '').trim() || lessonTitle(r.chapter);
        if (!lessonName) continue;
        const display = `${base} — ${lessonName}`;
        const key = lessonKey(display);
        if (!lessonMap.has(key)) lessonMap.set(key, { name: display, base, count: 0 });
        lessonMap.get(key)!.count += 1;
      }
      const lessons = [...lessonMap.values()];
      const chapters = [...chapterMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      lessons.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      setScopeChapters(chapters);
      setScopeLessons(lessons);
      if (!mChapter && chapters[0]) setMChapter(chapters[0].name);
      if (!mLesson && lessons[0]) setMLesson(lessons[0].name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function loadScopedPool(): Promise<Question[]> {
    const p = eqParams({ grade: mGrade });
    if (scopeMode === 'lesson') p.set('lesson', `eq.${lessonTitle(mLesson)}`);
    if (scopeMode === 'chapter') p.set('chapter', `like.${mChapter}*`);
    p.set('select', '*');
    p.set('order', 'id.asc');
    const all: Question[] = [];
    const limit = 1000;
    for (let offset = 0; ; offset += limit) {
      const pp = new URLSearchParams(p);
      pp.set('limit', String(limit));
      pp.set('offset', String(offset));
      const rows = await supabaseGet<Question[]>('questions', pp);
      all.push(...rows);
      if (rows.length < limit) break;
    }
    if (scopeMode === 'chapter') return all.filter((q) => baseChapter(q.chapter) === mChapter);
    if (scopeMode === 'lesson') {
      const base = baseChapter(mLesson);
      const title = lessonTitle(mLesson);
      return all.filter((q) => baseChapter(q.chapter) === base && ((q.lesson ?? '').trim() === title || lessonKey(q.chapter) === lessonKey(mLesson)));
    }
    return all;
  }

  async function generateExam() {
    if (!isSupabaseConfigured) return;
    setLoading(true); setError(''); setMatrixMsg(''); setGenerated([]);
    try {
      const totalLevel = LEVELS.reduce((s, l) => s + levelNeed[l], 0);
      const totalPart = QTYPES.reduce((s, q) => s + partNeed[q], 0);
      if (totalLevel !== totalPart) {
        setMatrixMsg(`Tổng theo mức (${totalLevel}) phải bằng tổng theo phần (${totalPart}).`);
        return;
      }
      const badPart = QTYPES.find((q) => partNeed[q] > 0 && !(partPoints[q] > 0));
      if (badPart) {
        setMatrixMsg(`Thầy đặt điểm cho ${QTYPE_LABEL[badPart]} lớn hơn 0 nhé.`);
        return;
      }
      const pool = await loadScopedPool();
      const buckets = {} as Record<Level, Record<QType, Question[]>>;
      for (const l of LEVELS) {
        buckets[l] = {} as Record<QType, Question[]>;
        for (const q of QTYPES) buckets[l][q] = shuffle(pool.filter((x) => x.level === l && x.qtype === q));
      }
      const codes: GeneratedCode[] = [];
      for (let c = 1; c <= numCodes; c++) {
        const capacity = {} as Record<Level, Record<QType, number>>;
        for (const l of LEVELS) {
          capacity[l] = {} as Record<QType, number>;
          for (const q of QTYPES) capacity[l][q] = buckets[l][q].length;
        }
        const cells = buildCellCounts(levelNeed, partNeed, capacity);
        if (!cells) {
          const shortages: string[] = [];
          for (const l of LEVELS) {
            const have = QTYPES.reduce((s, q) => s + buckets[l][q].length, 0);
            if (have < levelNeed[l]) shortages.push(`${l}: cần ${levelNeed[l]}, còn ${have}`);
          }
          for (const q of QTYPES) {
            const have = LEVELS.reduce((s, l) => s + buckets[l][q].length, 0);
            if (have < partNeed[q]) shortages.push(`${QTYPE_LABEL[q]}: cần ${partNeed[q]}, còn ${have}`);
          }
          setMatrixMsg(`Không đủ câu cho mã ${c}. ${shortages.length ? shortages.join('; ') : 'Ma trận mức × phần không khả thi với phạm vi đã chọn.'}`);
          return;
        }
        const qs: Question[] = [];
        for (const l of LEVELS) {
          for (const q of QTYPES) {
            for (let i = 0; i < cells[l][q]; i++) {
              const picked = buckets[l][q].pop()!;
              qs.push({ ...picked, points: partNeed[q] > 0 ? partPoints[q] / partNeed[q] : 0 });
            }
          }
        }
        codes.push({ code: c, questions: qs, rawPoints: QTYPES.reduce((s, q) => s + (partNeed[q] > 0 ? partPoints[q] : 0), 0) });
      }
      setGenerated(codes);
      setMatrixMsg(`Đã sinh ${codes.length} mã, mỗi mã ${totalLevel} câu, không trùng câu giữa các mã.`);
      setTab('print');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function loadTeacherData() {
    if (!isSupabaseConfigured || !session) return;
    try {
      const p = new URLSearchParams({ select: '*', order: 'id.desc', limit: '100' });
      const [cs, ss, as, es] = await Promise.all([
        supabaseGet<ClassRecord[]>('classes', p, true),
        supabaseGet<StudentRecord[]>('students', p, true),
        supabaseGet<Assignment[]>('assignments', p, true),
        supabaseGet<ExamRecord[]>('exams', p, true),
      ]);
      setClasses(cs); setStudents(ss); setAssignments(as); setExams(es);
      if (!resultAssignmentId && as[0]) setResultAssignmentId(String(as[0].id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleSignIn() {
    setLoading(true); setError('');
    try {
      const s = await signIn(email.trim(), password);
      setSession(s);
      setMatrixMsg('Đã đăng nhập.');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  async function handleSignUp() {
    setLoading(true); setError('');
    try {
      const s = await signUp(email.trim(), password, authRole);
      if (s) { setSession(s); setMatrixMsg('Đã tạo tài khoản và đăng nhập.'); }
      else setMatrixMsg('Đã tạo tài khoản. Nếu Supabase yêu cầu xác nhận email, hãy xác nhận rồi đăng nhập.');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  async function createClassAndStudents() {
    if (!session) { setError('Hãy đăng nhập giáo viên trước.'); return; }
    setLoading(true); setError('');
    try {
      const created = await supabaseInsert<ClassRecord[]>('classes', { name: className.trim(), grade: classGrade }, true);
      const cls = created[0];
      const names = studentNames.split('\n').map((x) => x.trim()).filter(Boolean);
      if (cls && names.length) await supabaseInsert('students', names.map((full_name) => ({ class_id: cls.id, full_name })), true);
      setClassName(''); setStudentNames('');
      await loadTeacherData();
      setMatrixMsg('Đã tạo lớp/học sinh.');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  async function saveGeneratedAsAssignment(assignNow = true) {
    if (!session) { setError('Hãy đăng nhập giáo viên trước khi lưu đề.'); setTab('assign'); return; }
    if (!generated.length) { setError('Hãy sinh mã đề trước.'); return; }
    setLoading(true); setError('');
    try {
      const examRows = await supabaseInsert<ExamRecord[]>('exams', {
        title: examTitle.trim() || `Đề Toán lớp ${mGrade}`,
        grade: mGrade,
        scope_chapter: scopeMode === 'chapter' ? mChapter : scopeMode === 'lesson' ? baseChapter(mLesson) : '',
        scope_lesson: scopeMode === 'lesson' ? mLesson : '',
        matrix: { levelNeed, partNeed, partPoints },
        codes: generated.map((c) => ({ code: c.code, questionIds: c.questions.map((q) => q.id), questionPoints: c.questions.map((q) => Number(q.points || 0)), rawPoints: c.rawPoints })),
        duration_minutes: duration,
      }, true);
      const exam = examRows[0];
      if (!assignNow) {
        await loadTeacherData();
        setMatrixMsg(`Đã lưu đề “${exam.title}” vào mục Đề đã lưu.`);
        return;
      }
      const code = makeJoinCode();
      await supabaseInsert('assignments', {
        exam_id: exam.id,
        class_id: selectedClassId ? Number(selectedClassId) : null,
        join_code: code,
        title: exam.title,
        duration_minutes: duration,
        show_result: true,
        is_open: true,
      }, true);
      await loadTeacherData();
      setJoinCode(code);
      setMatrixMsg(`Đã giao bài. Mã vào làm bài: ${code}`);
      setTab('assign');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  async function openSavedExam(exam: ExamRecord) {
    setLoading(true); setError('');
    try {
      const loaded: GeneratedCode[] = [];
      for (const c of exam.codes ?? []) {
        const qs = await loadQuestionsByIds(c.questionIds ?? []);
        loaded.push({ code: c.code, questions: qs.map((q, i) => ({ ...q, points: Number(c.questionPoints?.[i] ?? q.points ?? 0) })), rawPoints: Number(c.rawPoints ?? 10) });
      }
      setGenerated(loaded);
      setMGrade(exam.grade);
      setExamTitle(exam.title);
      setDuration(exam.duration_minutes ?? 45);
      setMatrixMsg(`Đã mở đề đã lưu “${exam.title}”.`);
      setTab('print');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  async function assignSavedExam(exam: ExamRecord) {
    if (!session) { setError('Hãy đăng nhập giáo viên trước khi giao bài.'); return; }
    setLoading(true); setError('');
    try {
      const code = makeJoinCode();
      await supabaseInsert('assignments', { exam_id: exam.id, class_id: selectedClassId ? Number(selectedClassId) : null, join_code: code, title: exam.title, duration_minutes: exam.duration_minutes ?? duration, show_result: true, is_open: true }, true);
      await loadTeacherData();
      setJoinCode(code);
      setMatrixMsg(`Đã giao đề “${exam.title}”. Mã vào làm bài: ${code}`);
      setTab('assign');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  async function deleteSavedExam(exam: ExamRecord) {
    if (!window.confirm(`Xóa đề đã lưu “${exam.title}”? Bài giao và kết quả của đề này cũng sẽ bị xóa.`)) return;
    setLoading(true); setError('');
    try {
      const p = eqParams({ exam_id: exam.id });
      await supabaseDelete('assignments', p, true);
      const ep = eqParams({ id: exam.id });
      await supabaseDelete('exams', ep, true);
      await loadTeacherData();
      setMatrixMsg(`Đã xóa đề “${exam.title}”.`);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  async function loadQuestionsByIds(ids: number[]): Promise<Question[]> {
    if (!ids.length) return [];
    const p = new URLSearchParams();
    p.set('select', '*');
    p.set('id', `in.(${ids.join(',')})`);
    const rows = await supabaseGet<Question[]>('questions', p);
    const byId = new Map(rows.map((q) => [q.id, q]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as Question[];
  }

  async function startTake() {
    setLoading(true); setError(''); setTakeResult(''); setAnswers({});
    try {
      const p = eqParams({ join_code: joinCode.trim().toUpperCase() });
      p.set('select', '*');
      const as = await supabaseGet<Assignment[]>('assignments', p);
      const assignment = as[0];
      if (!assignment || !assignment.is_open) throw new Error('Mã giao bài không đúng hoặc bài đã đóng.');
      const ep = eqParams({ id: assignment.exam_id });
      ep.set('select', '*');
      const es = await supabaseGet<ExamRecord[]>('exams', ep);
      const exam = es[0];
      if (!exam) throw new Error('Không tìm thấy đề của bài giao này.');
      const nameKey = studentName.trim() || 'hoc-sinh';
      const hash = [...nameKey].reduce((s, ch) => s + ch.charCodeAt(0), 0);
      const idx = exam.codes.length ? hash % exam.codes.length : 0;
      setTakeAssignment(assignment); setTakeExam(exam); setTakeCodeIndex(idx);
      const loaded = await loadQuestionsByIds(exam.codes[idx]?.questionIds ?? []);
      const savedPoints = exam.codes[idx]?.questionPoints ?? [];
      setTakeQuestions(loaded.map((q, i) => ({ ...q, points: savedPoints[i] ?? q.points })));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  async function submitTake() {
    if (!takeAssignment || !takeExam) return;
    if (!studentName.trim()) { setError('Học sinh nhập họ tên trước khi nộp.'); return; }
    setLoading(true); setError('');
    try {
      let auto = 0;
      let pendingEssay = false;
      const detail: Record<string, unknown> = {};
      for (const q of takeQuestions) {
        const g = gradeQuestion(q, answers[String(q.id)]);
        auto += g.score;
        pendingEssay = pendingEssay || g.pending;
        detail[String(q.id)] = g;
      }
      const raw = takeQuestions.reduce((s, q) => s + Number(q.points || 0), 0);
      const scaled = raw > 0 ? (auto / raw) * 10 : 0;
      await supabaseInsert('submissions', {
        assignment_id: takeAssignment.id,
        student_name: studentName.trim(),
        class_name: takeClassName.trim(),
        code_index: takeCodeIndex,
        answers,
        score: auto,
        auto_score: auto,
        essay_score: pendingEssay ? null : 0,
        detail,
        status: pendingEssay ? 'waiting_essay' : 'graded',
      });
      setTakeResult(pendingEssay
        ? `Đã nộp. Điểm tự động tạm tính: ${auto.toFixed(2)}/${raw.toFixed(2)} (quy đổi ${scaled.toFixed(2)}/10). Phần tự luận chờ giáo viên chấm.`
        : `Đã nộp. Điểm: ${auto.toFixed(2)}/${raw.toFixed(2)} (quy đổi ${scaled.toFixed(2)}/10).`);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  async function loadSubmissions(assignmentId = resultAssignmentId) {
    if (!session || !assignmentId) return;
    setLoading(true); setError('');
    try {
      const p = eqParams({ assignment_id: Number(assignmentId) });
      p.set('select', '*');
      p.set('order', 'submitted_at.desc');
      p.set('limit', '300');
      setSubmissions(await supabaseGet<Submission[]>('submissions', p, true));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  async function gradeEssay(sub: Submission) {
    const essay = Number(essayScores[String(sub.id)] ?? sub.essay_score ?? 0);
    const auto = Number(sub.auto_score ?? sub.score ?? 0);
    setLoading(true); setError('');
    try {
      await supabaseUpdate('submissions', eqParams({ id: sub.id }), {
        essay_score: essay,
        score: auto + essay,
        status: 'graded',
        graded_at: new Date().toISOString(),
      }, true);
      await loadSubmissions();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  function exportResultsCsv() {
    const rows = [['Họ tên', 'Lớp', 'Mã đề', 'Điểm', 'Điểm tự động', 'Điểm tự luận', 'Trạng thái', 'Thời gian nộp']];
    for (const s of submissions) rows.push([s.student_name, s.class_name ?? '', String(s.code_index + 1), String(s.score ?? ''), String(s.auto_score ?? ''), String(s.essay_score ?? ''), s.status ?? '', s.submitted_at ?? '']);
    downloadText('ket-qua.csv', rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv;charset=utf-8');
  }

  function partPointsOf(qs: Question[]): number {
    return qs.reduce((s, q) => s + Number(q.points || 0), 0);
  }

  function exportDocx(kind: 'de' | 'dapan' = 'de') {
    const enc = new TextEncoder();
    const run = (text: string, bold = false, size = 24) => `<w:r><w:rPr>${bold ? '<w:b/>' : ''}<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
    const richRuns = (text: string, bold = false, size = 24): string => {
      const parts = String(text ?? '').split(/(\$\$[\s\S]*?\$\$|\$[^$]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g);
      return parts.map((p) => {
        if (/^\$\$[\s\S]*\$\$$/.test(p)) return `<m:oMath>${latexToOmml(p.slice(2, -2))}</m:oMath>`;
        if (/^\$[^$]*\$$/.test(p)) return `<m:oMath>${latexToOmml(p.slice(1, -1))}</m:oMath>`;
        if (/^\\\([\s\S]*\\\)$/.test(p)) return `<m:oMath>${latexToOmml(p.slice(2, -2))}</m:oMath>`;
        if (/^\\\[[\s\S]*\\\]$/.test(p)) return `<m:oMath>${latexToOmml(p.slice(2, -2))}</m:oMath>`;
        return p ? run(p, bold, size) : '';
      }).join('');
    };
    const para = (text: string, opts: { bold?: boolean; size?: number; align?: string; indent?: number; before?: number; after?: number; rich?: boolean } = {}) => `<w:p><w:pPr>${opts.align ? `<w:jc w:val="${opts.align}"/>` : ''}${opts.indent ? `<w:ind w:left="${opts.indent}"/>` : ''}<w:spacing w:before="${opts.before ?? 0}" w:after="${opts.after ?? 60}" w:line="312" w:lineRule="auto"/></w:pPr>${opts.rich ? richRuns(text, opts.bold, opts.size ?? 24) : run(text, opts.bold, opts.size ?? 24)}</w:p>`;
    const body: string[] = [];
    generated.forEach((code, ci) => {
      if (ci > 0) body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
      body.push(para(`${kind === 'dapan' ? 'ĐÁP ÁN ĐỀ' : 'ĐỀ'} TOÁN LỚP ${mGrade} — MÃ ĐỀ ${String(code.code).padStart(2, '0')}`, { bold: true, size: 28, align: 'center', after: 40 }));
      body.push(para(`Thời gian: ${duration} phút · Tổng điểm: ${fmtPoints(code.rawPoints)} điểm · ${examDateTime()}`, { align: 'center', after: 120 }));
      for (const qt of QTYPES) {
        const qs = code.questions.filter((q) => q.qtype === qt);
        if (!qs.length) continue;
        body.push(para(`${QTYPE_LABEL[qt]} (${fmtPoints(partPointsOf(qs))} điểm)`, { bold: true, before: 120, after: 80 }));
        qs.forEach((q, i) => {
          body.push(para(`Câu ${i + 1}. ${stripSourcePrefix(q.content)}`, { after: 40, rich: true }));
          const docxOpts = (q.options ?? []).map((op, oi) => `${'ABCD'[oi] ?? oi + 1}. ${stripOptionPrefix(op)}`);
          const docxLayout = optionLayout(q.options ?? []);
          if (docxLayout === 4) body.push(para(docxOpts.join('        '), { indent: 360, after: 20, rich: true }));
          else if (docxLayout === 2) { body.push(para(docxOpts.slice(0, 2).join('        '), { indent: 360, after: 20, rich: true })); body.push(para(docxOpts.slice(2).join('        '), { indent: 360, after: 20, rich: true })); }
          else docxOpts.forEach((op) => body.push(para(op, { indent: 360, after: 20, rich: true })));
          if (kind === 'dapan') {
            body.push(para(`Đáp án: ${q.correct}`, { bold: true, indent: 360, after: 20, rich: true }));
            if (q.explanation) body.push(para(`Lời giải: ${q.explanation}`, { indent: 360, after: 80, rich: true }));
          }
        });
      }
    });
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`;
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
    const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    downloadBlob(kind === 'dapan' ? 'dap-an.docx' : 'de-toan.docx', zipStore([
      { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
      { name: '_rels/.rels', data: enc.encode(rels) },
      { name: 'word/document.xml', data: enc.encode(documentXml) },
      { name: 'word/styles.xml', data: enc.encode(stylesXml) },
      { name: 'word/_rels/document.xml.rels', data: enc.encode(docRels) },
    ]));
  }

  function exportLatex(kind: 'de' | 'dapan' = 'de') {
    const lines: string[] = [
      '% Biên dịch bằng XeLaTeX hoặc LuaLaTeX',
      '\\documentclass[12pt,a4paper]{article}',
      '\\usepackage[margin=2cm]{geometry}',
      '\\usepackage{fontspec}',
      '\\setmainfont{Times New Roman}',
      '\\usepackage{amsmath,amssymb}',
      '\\usepackage{enumitem}',
      '\\setlength{\\parskip}{4pt}',
      '\\setlength{\\parindent}{0pt}',
      '\\begin{document}',
    ];
    generated.forEach((code, ci) => {
      if (ci > 0) lines.push('\\newpage');
      lines.push(`\\begin{center}\\textbf{\\large ${kind === 'dapan' ? 'ĐÁP ÁN ĐỀ' : 'ĐỀ'} TOÁN LỚP ${mGrade} --- MÃ ĐỀ ${String(code.code).padStart(2, '0')}}\\\\[2pt] Thời gian: ${duration} phút \\quad Tổng điểm: ${fmtPoints(code.rawPoints)} điểm \\quad ${examDateTime()}\\end{center}`);
      for (const qt of QTYPES) {
        const qs = code.questions.filter((q) => q.qtype === qt);
        if (!qs.length) continue;
        lines.push(`\\textbf{${QTYPE_LABEL[qt]} (${fmtPoints(partPointsOf(qs))} điểm)}`);
        qs.forEach((q, i) => {
          lines.push(`\\textbf{Câu ${i + 1}.} ${stripSourcePrefix(q.content)}`);
          if (q.options?.length) {
            const texOpts = q.options.map((op, oi) => `\\textbf{${'ABCD'[oi] ?? oi + 1}.} ${stripOptionPrefix(op)}`);
            const texLayout = optionLayout(q.options);
            if (texLayout === 4) lines.push(texOpts.join(' \\qquad '));
            else if (texLayout === 2) { lines.push(texOpts.slice(0, 2).join(' \\qquad ')); lines.push(texOpts.slice(2).join(' \\qquad ')); }
            else texOpts.forEach((op) => lines.push(op));
          }
          if (kind === 'dapan') {
            lines.push(`\\textbf{Đáp án:} ${q.correct}`);
            if (q.explanation) lines.push(`\\textbf{Lời giải:} ${q.explanation}`);
          }
        });
      }
    });
    lines.push('\\end{document}');
    downloadText(kind === 'dapan' ? 'dap-an.tex' : 'de-toan.tex', lines.join('\n'), 'text/x-tex;charset=utf-8');
  }

  function exportPdf(kind: 'de' | 'dapan' = 'de') {
    setShowAnswers(kind === 'dapan');
    setTab('print');
    window.setTimeout(() => window.print(), 350);
  }

  async function loadAdminQuestion() {
    if (!adminForm.id) return;
    setLoading(true); setError('');
    try {
      const p = eqParams({ id: Number(adminForm.id) });
      p.set('select', '*');
      const rows = await supabaseGet<Question[]>('questions', p, true);
      const q = rows[0];
      if (!q) throw new Error('Không tìm thấy câu hỏi.');
      setAdminForm({ id: String(q.id), grade: q.grade, chapter: q.chapter, dang: q.dang, level: q.level, qtype: q.qtype, content: q.content, options: (q.options ?? []).join('\n'), correct: q.correct, explanation: q.explanation, points: Number(q.points || 0) });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  async function saveAdminQuestion() {
    if (!session) { setError('Hãy đăng nhập giáo viên trước.'); return; }
    setLoading(true); setError('');
    try {
      const body = {
        grade: Number(adminForm.grade), chapter: adminForm.chapter, dang: adminForm.dang, level: adminForm.level, qtype: adminForm.qtype,
        content: adminForm.content, options: adminForm.options.split('\n').map((x) => x.trim()).filter(Boolean),
        correct: adminForm.correct, explanation: adminForm.explanation, points: Number(adminForm.points || 0), image_key: '', image_url: '', geogebra: '',
      };
      if (adminForm.id) await supabaseUpdate('questions', eqParams({ id: Number(adminForm.id) }), body, true);
      else {
        const rows = await supabaseInsert<Question[]>('questions', { id: Date.now(), ...body }, true);
        if (rows[0]) setAdminForm({ ...adminForm, id: String(rows[0].id) });
      }
      setMatrixMsg('Đã lưu câu hỏi.');
      await loadOverview();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  async function deleteAdminQuestion() {
    if (!session || !adminForm.id) return;
    if (!window.confirm('Xóa câu hỏi này?')) return;
    setLoading(true); setError('');
    try {
      await supabaseDelete('questions', eqParams({ id: Number(adminForm.id) }), true);
      setAdminForm({ ...adminForm, id: '' });
      setMatrixMsg('Đã xóa câu hỏi.');
      await loadOverview();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  useEffect(() => { void loadOverview(); }, []);
  useEffect(() => { if (tab === 'bank') void loadBank(0); }, [tab]);
  useEffect(() => { if (tab === 'theory') void loadTheory(); }, [tab, theoryGrade]);
  useEffect(() => { if (tab === 'english' && hasEnglish && englishMode === 'problems') { setEnglishPage(0); void loadEnglish(0); } }, [tab, englishParams, hasEnglish, englishMode]);
  useEffect(() => { if (tab === 'english' && hasEnglish && englishMode === 'vocab') { setVocabPage(0); void loadVocab(0); } }, [tab, hasEnglish, englishMode, englishGrade, englishLesson, englishSearch]);
  useEffect(() => { if (tab === 'english') void loadEnglishDangs(); }, [tab, englishGrade, englishLesson]);
  useEffect(() => { if (session) { void loadProfile(); } else setProfile(null); }, [session]);
  useEffect(() => { if (session && canTeach) void loadTeacherData(); }, [session, canTeach]);
  useEffect(() => { if (tab === 'admin' && isAdmin) void loadProfiles(); }, [tab, isAdmin]);
  useEffect(() => { if (tab === 'results' && session) void loadSubmissions(); }, [tab, session]);
  useEffect(() => { if (tab === 'matrix') void loadScopes(); }, [tab, mGrade]);
  useEffect(() => {
    fetch('/api/ai-chat').then((r) => r.json()).then((d) => setAiStatus(d.enabled ? `AI đã bật: ${(d.providers || []).join(', ')}` : 'AI chưa bật: đặt GROQ_API_KEY hoặc GEMINI_API_KEY trong Vercel')).catch(() => setAiStatus('AI chưa bật'));
  }, []);
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice.catch(() => null);
      setInstallPrompt(null);
      return;
    }
    setShowInstallHelp(true);
  }

  function aiContext(): string {
    const parts = [`Mục đang mở: ${tab}`, `Lớp tạo đề: ${mGrade}`, `Phạm vi: ${scopeMode === 'chapter' ? mChapter : scopeMode === 'lesson' ? mLesson : 'Toàn khối'}`];
    if (questions[0]) parts.push(`Câu đầu danh sách đang xem #${questions[0].id}: ${questions[0].content}\nĐáp án: ${questions[0].correct}\nLời giải: ${questions[0].explanation}`);
    if (generated[0]) parts.push(`Đề đã sinh: ${generated.length} mã, mã 1 có ${generated[0].questions.length} câu.`);
    return parts.join('\n');
  }

  async function sendAi() {
    const text = aiInput.trim();
    if (!text || aiBusy) return;
    const next = [...aiMessages, { role: 'user' as const, content: text }];
    setAiMessages(next);
    setAiInput('');
    setAiBusy(true);
    try {
      const res = await fetch('/api/ai-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next, context: aiContext() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `AI HTTP ${res.status}`);
      setAiMessages([...next, { role: 'assistant', content: data.text || 'AI chưa trả lời được.' }]);
      if (data.provider) setAiStatus(`AI đã bật: ${data.provider}`);
    } catch (e) {
      setAiMessages([...next, { role: 'assistant', content: e instanceof Error ? e.message : String(e) }]);
    } finally { setAiBusy(false); }
  }

  return (
    <div className="app">
      <header className="topbar no-print">
        <div>
          <h1>Toán THPT Thầy Đôi</h1>
          <p>Ngân hàng câu hỏi, lý thuyết, Toán tiếng Anh và ma trận đề Toán THPT</p>
          <AppClock />
          <button className="install-btn" onClick={() => void installApp()}>📲 Cài ứng dụng</button>
        </div>
        <nav>
          {([['overview', 'Tổng quan'], ['bank', 'Ngân hàng câu hỏi'], ['theory', 'Lý thuyết'], ['english', 'Toán tiếng Anh'], ['matrix', 'Tạo đề'], ['print', 'In đề'], ['assign', 'Giao bài'], ['take', 'Học sinh làm bài'], ['results', 'Kết quả'], ['admin', 'Quản trị']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{label}</button>
          ))}
        </nav>
      </header>
      {showInstallHelp && (
        <section className="notice no-print">
          <strong>Cài ứng dụng:</strong> Android mở bằng Chrome rồi bấm <b>Cài ứng dụng</b> hoặc menu ⋮ → <b>Cài đặt ứng dụng</b>. iPhone mở bằng Safari → <b>Chia sẻ</b> → <b>Thêm vào màn hình chính</b>. <button onClick={() => setShowInstallHelp(false)}>Đóng</button>
        </section>
      )}

      {!isSupabaseConfigured && (
        <section className="notice no-print">
          <strong>Chưa cấu hình Supabase.</strong> Hãy đặt <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code> trong biến môi trường Vercel, chạy <code>supabase/schema.sql</code> và import dữ liệu trước khi dùng.
        </section>
      )}
      {error && <section className="notice danger no-print">{error}</section>}
      {loading && <p className="muted no-print">Đang tải…</p>}
      <section className="card no-print">
        {session ? (
          <div className="filters"><strong>{isAdmin ? 'Quản trị' : profile?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}: {session.user?.email ?? 'đã đăng nhập'}</strong><span>{isAdmin ? 'Toàn quyền' : profile?.full_access ? 'Đã được cấp full tính năng' : inTrial ? `Dùng thử full tính năng đến ${new Date(profile!.trial_ends_at).toLocaleDateString('vi-VN')}` : 'Tài khoản giới hạn — liên hệ quản trị để cấp quyền'}</span><button onClick={() => { signOut(); setSession(null); setProfile(null); }}>Đăng xuất</button></div>
        ) : (
          <div className="filters">
            <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" /></label>
            <label>Mật khẩu<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mật khẩu" /></label>
            <label>Vai trò đăng ký<select value={authRole} onChange={(e) => setAuthRole(e.target.value as 'student' | 'teacher')}><option value="student">Học sinh</option><option value="teacher">Giáo viên</option></select></label>
            <button className="primary" onClick={() => void handleSignIn()}>Đăng nhập</button>
            <button onClick={() => void handleSignUp()}>Tạo tài khoản</button>
            <span>Tài khoản mới được dùng thử full tính năng 3 ngày.</span>
          </div>
        )}
      </section>

      {tab === 'overview' && (
        <main className="grid">
          <section className="card"><h2>Tổng số câu</h2><p className="big">{overview?.total ?? '—'}</p><p>Lý thuyết: {overview?.theory ?? '—'} bài</p></section>
          <section className="card"><h2>Theo lớp</h2>{[10, 11, 12].map((g) => <p key={g}>Lớp {g}: <strong>{overview?.byGrade[g] ?? '—'}</strong></p>)}</section>
          <section className="card"><h2>Theo mức</h2>{LEVELS.map((l) => <p key={l}>{l}: <strong>{overview?.byLevel[l] ?? '—'}</strong></p>)}</section>
          <section className="card"><h2>Theo phần</h2>{QTYPES.map((q) => <p key={q}>{QTYPE_LABEL[q]}: <strong>{overview?.byType[q] ?? '—'}</strong></p>)}</section>
          <section className="card"><h2>Toán tiếng Anh</h2><p className="big">{englishTotalAll || '—'}</p><p>Bài toán THPT bằng tiếng Anh, có đáp án, lời giải Anh–Việt và từ vựng.</p><button className="primary" onClick={() => setTab('english')}>Mở mục Toán tiếng Anh</button></section>
        </main>
      )}

      {tab === 'bank' && (
        <main>
          <section className="filters no-print">
            <label>Lớp<select value={grade} onChange={(e) => { setGrade(Number(e.target.value)); setPage(0); }}><option>10</option><option>11</option><option>12</option></select></label>
            <label>Chương<input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Tên chương" /></label>
            <label>Dạng<input value={dang} onChange={(e) => setDang(e.target.value)} placeholder="Dạng toán" /></label>
            <label>Mức<select value={level} onChange={(e) => setLevel(e.target.value)}><option value="">Tất cả</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label>
            <label>Loại<select value={qtype} onChange={(e) => setQtype(e.target.value)}><option value="">Tất cả</option>{QTYPES.map((q) => <option key={q} value={q}>{QTYPE_LABEL[q]}</option>)}</select></label>
            <label>Tìm kiếm<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nội dung, đáp án, lời giải" /></label>
            <button onClick={() => { setPage(0); void loadBank(0); }}>Lọc</button>
            <label className="check"><input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} /> Hiện đáp án/lời giải</label>
          </section>
          <p className="muted">Có {bankTotal} câu khớp bộ lọc. Trang {page + 1}.</p>
          {questions.map((q) => <QuestionCard key={q.id} q={q} showAnswers={showAnswers} />)}
          <div className="pager no-print">
            <button disabled={page <= 0} onClick={() => { const p = page - 1; setPage(p); void loadBank(p); }}>Trang trước</button>
            <button disabled={(page + 1) * pageSize >= bankTotal} onClick={() => { const p = page + 1; setPage(p); void loadBank(p); }}>Trang sau</button>
          </div>
        </main>
      )}

      {tab === 'theory' && (
        <main>
          <div className="filters no-print">
            {[10, 11, 12].map((g) => <button key={g} className={theoryGrade === g ? 'active' : ''} onClick={() => setTheoryGrade(g)}>Lớp {g}</button>)}
          </div>
          {theory.map((n) => (
            <article className="card" key={n.id}>
              <p className="meta">{n.chapter}</p>
              <h2>{n.title}</h2>
              <div className="content"><MathText text={n.content} /></div>
            </article>
          ))}
        </main>
      )}

      {tab === 'english' && !hasEnglish && (
        <main><section className="card english-hero"><h2>Toán tiếng Anh THPT</h2><p>{session ? 'Tài khoản của bạn chưa được cấp quyền xem bài tập tiếng Anh. Quản trị cấp quyền thì bạn xem được ngay.' : 'Bạn đăng nhập hoặc tạo tài khoản để dùng thử 3 ngày full tính năng; sau đó quản trị cấp quyền mới xem được bài tập tiếng Anh.'}</p>{session && <button className="primary" onClick={() => void requestEnglish()}>{profile?.english_requested ? 'Đã gửi yêu cầu cấp quyền' : 'Yêu cầu cấp quyền tiếng Anh'}</button>}</section></main>
      )}
      {tab === 'english' && hasEnglish && (
        <main>
          <section className="card english-hero">
            <h2>Toán tiếng Anh THPT</h2>
            <p>Ngân hàng Toán tiếng Anh phân theo Bài, Dạng và Mức độ NB–TH–VD–VDC như Toán tiếng Việt. Mỗi câu đều có đáp án, lời giải tiếng Anh, giải thích tiếng Việt và từ vựng trọng tâm.</p>
            <div className="filters no-print">
              <button className={englishMode === 'problems' ? 'primary' : ''} onClick={() => setEnglishMode('problems')}>Bài tập</button><button className={englishMode === 'vocab' ? 'primary' : ''} onClick={() => setEnglishMode('vocab')}>Từ vựng bắt buộc</button><button className="primary" onClick={() => void pickRandomEnglishProblem()}>Luyện nhanh 1 câu</button>
              <label className="check"><input type="checkbox" checked={englishShowAllSolutions} onChange={(e) => setEnglishShowAllSolutions(e.target.checked)} /> Hiện tất cả lời giải</label>
              <label className="check"><input type="checkbox" checked={englishOnlyInteresting} onChange={(e) => { setEnglishOnlyInteresting(e.target.checked); setEnglishPage(0); }} /> Chỉ câu hay</label>
            </div>
          </section>
          <section className="filters no-print">
            <label>Lớp<select value={String(englishGrade)} onChange={(e) => { setEnglishGrade(e.target.value === 'all' ? 'all' : Number(e.target.value) as 10 | 11 | 12); setEnglishLesson(''); setEnglishDang(''); setEnglishPage(0); }}><option value="all">Tất cả</option><option value="10">Lớp 10</option><option value="11">Lớp 11</option><option value="12">Lớp 12</option></select></label>
            <label>Bài<select value={englishLesson} onChange={(e) => { setEnglishLesson(e.target.value); setEnglishDang(''); setEnglishPage(0); }}><option value="">Tất cả</option>{englishLessons.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label>Dạng<select value={englishDang} onChange={(e) => { setEnglishDang(e.target.value); setEnglishPage(0); }}><option value="">{englishLesson ? 'Tất cả' : 'Chọn bài trước'}</option>{englishDangOptions.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label>Mức độ<select value={englishLevel} onChange={(e) => { setEnglishLevel(e.target.value); setEnglishPage(0); }}><option value="">Tất cả</option><option>NB</option><option>TH</option><option>VD</option><option>VDC</option></select></label>
            <label>Tìm kiếm<input value={englishSearch} onChange={(e) => { setEnglishSearch(e.target.value); setEnglishPage(0); }} placeholder="probability, đạo hàm, Bayes..." /></label>
          </section>
          <p className="muted">Có {englishTotal} câu khớp bộ lọc · Tổng kho Toán tiếng Anh: {englishTotalAll || englishTotal} câu · Trang {englishPage + 1}</p>
          {englishMode === 'vocab' && (<>
            <p className="muted">Từ vựng tiếng Anh bắt buộc phải nắm: {vocabTotal} mục · Đã nắm {vocabRows.filter((v) => mastered.has(v.id)).length}/{vocabRows.length} mục trang này · Trang {vocabPage + 1}</p>
            {vocabRows.map((v) => (
              <article className="card english-card" key={v.id}>
                <p className="meta">Grade {v.grade} · Bài: {v.lesson_vi} ({v.lesson}) · Gặp trong {v.freq} câu</p>
                <h2>{v.term}</h2><p><strong>Nghĩa:</strong> {v.meaning}</p>
                <label className="check"><input type="checkbox" checked={mastered.has(v.id)} onChange={() => toggleMastered(v.id)} /> Đã nắm từ này</label>
              </article>
            ))}
            {vocabRows.length === 0 && <section className="notice">Chưa có từ vựng khớp bộ lọc.</section>}
            <div className="pager no-print"><button disabled={vocabPage <= 0} onClick={() => { const pg = vocabPage - 1; setVocabPage(pg); void loadVocab(pg); }}>Trang trước</button><button disabled={(vocabPage + 1) * pageSize >= vocabTotal} onClick={() => { const pg = vocabPage + 1; setVocabPage(pg); void loadVocab(pg); }}>Trang sau</button></div>
          </>)}
          {englishMode === 'problems' && englishQuestions.map((p) => {
            const open = englishShowAllSolutions || englishOpenId === p.id;
            return (
              <article className="card english-card" key={p.id}>
                <p className="meta">ID {p.id} · Grade {p.grade} · Bài: {p.lesson_vi} ({p.lesson}) · Dạng: {p.dang_vi} ({p.dang}) · Mức: {p.level} · {QTYPE_LABEL[p.qtype]}{p.interesting ? ' · Câu hay' : ''}</p>
                <h2>{p.title}</h2>
                <div className="content"><MathText text={p.problem} /></div>
                {p.options?.length > 0 && <ol className={`options-grid cols-${optionLayout(p.options)}`}>{p.options.map((op, i) => <li key={i}><MathText text={`${'ABCD'[i]}. ${stripOptionPrefix(op)}`} /></li>)}</ol>}
                <div className="vocab-row">{(p.vocabulary ?? []).map((v) => <span className="vocab-chip" key={v.term}><strong>{v.term}</strong>: {v.meaning}</span>)}</div>
                <div className="filters no-print">
                  <button className={open ? '' : 'primary'} onClick={() => setEnglishOpenId(open && !englishShowAllSolutions ? null : p.id)}>{open ? 'Ẩn lời giải' : 'Xem đáp án & lời giải'}</button>
                </div>
                {open && (
                  <div className="answer">
                    <p><strong>Answer:</strong> <MathText text={p.answer} /></p>
                    <div className="solution-grid">
                      <div><h3>Solution</h3><div className="content"><MathText text={p.solution_en} /></div></div>
                      <div><h3>Giải thích tiếng Việt</h3><div className="content"><MathText text={p.solution_vi} /></div></div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          {englishMode === 'problems' && englishQuestions.length === 0 && <section className="notice">Chưa có câu khớp bộ lọc. Thầy đổi lớp/bài/dạng/mức hoặc xóa từ khóa tìm kiếm nhé.</section>}
          {englishMode === 'problems' && <div className="pager no-print">
            <button disabled={englishPage <= 0} onClick={() => { const pg = englishPage - 1; setEnglishPage(pg); void loadEnglish(pg); }}>Trang trước</button>
            <button disabled={(englishPage + 1) * pageSize >= englishTotal} onClick={() => { const pg = englishPage + 1; setEnglishPage(pg); void loadEnglish(pg); }}>Trang sau</button>
          </div>}
        </main>
      )}

      {tab === 'matrix' && (
        <main className="card no-print">
          <h2>Tạo đề theo ma trận</h2>
          <div className="filters">
            <label>Lớp<select value={mGrade} onChange={(e) => { setMGrade(Number(e.target.value)); setMChapter(''); setMLesson(''); }}><option>10</option><option>11</option><option>12</option></select></label>
            <label>Phạm vi<select value={scopeMode} onChange={(e) => setScopeMode(e.target.value as 'all' | 'chapter' | 'lesson')}><option value="all">Toàn khối</option><option value="chapter">Theo chương</option><option value="lesson">Theo bài</option></select></label>
            {scopeMode === 'chapter' && <label>Chương<select value={mChapter} onChange={(e) => setMChapter(e.target.value)}>{scopeChapters.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count} câu)</option>)}</select></label>}
            {scopeMode === 'lesson' && <label>Bài<select value={mLesson} onChange={(e) => setMLesson(e.target.value)}>{scopeLessons.map((l) => <option key={l.name} value={l.name}>{l.name} ({l.count} câu)</option>)}</select></label>}
            <label>Số mã đề<input type="number" min={1} max={50} value={numCodes} onChange={(e) => setNumCodes(Math.max(1, Math.min(50, Number(e.target.value))))} /></label>
          </div>
          <h3>Số câu theo mức</h3>
          <div className="filters">{LEVELS.map((l) => <label key={l}>{l}<input type="number" min={0} value={levelNeed[l]} onChange={(e) => setLevelNeed({ ...levelNeed, [l]: Math.max(0, Number(e.target.value)) })} /></label>)}</div>
          <h3>Số câu theo phần</h3>
          <div className="filters">{QTYPES.map((q) => <label key={q}>{QTYPE_LABEL[q]}<input type="number" min={0} value={partNeed[q]} onChange={(e) => setPartNeed({ ...partNeed, [q]: Math.max(0, Number(e.target.value)) })} /></label>)}</div>
          <h3>Điểm theo phần</h3>
          <div className="filters">{QTYPES.map((q) => <label key={q}>{QTYPE_LABEL[q]}<input type="number" min={0} step="0.25" value={partPoints[q]} onChange={(e) => setPartPoints({ ...partPoints, [q]: Math.max(0, Number(e.target.value)) })} /><span className="muted">{partNeed[q] > 0 ? `${fmtPoints(partPoints[q] / partNeed[q])} đ/câu` : '—'}</span></label>)}</div>
          <p className="muted">Tổng điểm đề: {fmtPoints(QTYPES.reduce((s, q) => s + (partNeed[q] > 0 ? partPoints[q] : 0), 0))} điểm. Điểm mỗi câu bằng điểm của phần chia cho số câu của phần đó. Tổng theo mức phải bằng tổng theo phần; thiếu câu sẽ báo rõ.</p>
          <button className="primary" onClick={() => void generateExam()}>Sinh mã đề</button>
          <div className="filters">
            <label>Tên đề<input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} /></label>
            <label>Thời gian (phút)<input type="number" min={1} value={duration} onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))} /></label>
            <label>Lớp giao bài<select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}><option value="">Không gắn lớp</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name} — lớp {c.grade}</option>)}</select></label>
            <button className="primary" onClick={() => void saveGeneratedAsAssignment(false)} disabled={!generated.length}>Lưu đề</button>
            <button onClick={() => void saveGeneratedAsAssignment(true)} disabled={!generated.length}>Lưu & giao bài</button>
            <button onClick={() => exportDocx('de')} disabled={!generated.length}>Xuất đề DOCX</button>
            <button onClick={() => exportDocx('dapan')} disabled={!generated.length}>Xuất đáp án DOCX</button>
            <button onClick={() => exportPdf('de')} disabled={!generated.length}>Xuất đề PDF</button>
            <button onClick={() => exportPdf('dapan')} disabled={!generated.length}>Xuất đáp án PDF</button>
            <button onClick={() => exportLatex('de')} disabled={!generated.length}>Xuất đề LaTeX</button>
            <button onClick={() => exportLatex('dapan')} disabled={!generated.length}>Xuất đáp án LaTeX</button>
          </div>
          {matrixMsg && <p className="notice">{matrixMsg}</p>}
          <section className="card">
            <h3>Đề đã lưu</h3>
            {!session && <p className="muted">Đăng nhập giáo viên để lưu và xem các đề đã tạo.</p>}
            {session && exams.length === 0 && <p className="muted">Chưa có đề nào được lưu. Sinh mã đề rồi bấm “Lưu đề” nhé.</p>}
            {session && exams.map((ex) => (
              <article className="question" key={ex.id}>
                <p><strong>{ex.title}</strong> · Lớp {ex.grade} · {(ex.codes ?? []).length} mã đề · {ex.duration_minutes ?? 45} phút</p>
                <p className="meta">{ex.scope_lesson || ex.scope_chapter || 'Toàn khối'}{ex.created_at ? ` · ${new Date(ex.created_at).toLocaleString('vi-VN')}` : ''}</p>
                <div className="filters">
                  <button onClick={() => void openSavedExam(ex)}>Xem / In đề</button>
                  <button onClick={() => void assignSavedExam(ex)}>Giao bài</button>
                  <button onClick={() => void deleteSavedExam(ex)}>Xóa</button>
                </div>
              </article>
            ))}
          </section>
        </main>
      )}

      {tab === 'print' && (
        <main>
          <div className="no-print filters">
            <button className="primary" onClick={() => exportPdf('de')}>In đề / Xuất PDF</button>
            <button onClick={() => exportPdf('dapan')}>In đáp án / Xuất PDF</button>
            <button onClick={() => exportDocx('de')} disabled={!generated.length}>Xuất đề DOCX</button>
            <button onClick={() => exportDocx('dapan')} disabled={!generated.length}>Xuất đáp án DOCX</button>
            <button onClick={() => exportLatex('de')} disabled={!generated.length}>Xuất đề LaTeX</button>
            <button onClick={() => exportLatex('dapan')} disabled={!generated.length}>Xuất đáp án LaTeX</button>
            <label className="check"><input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} /> In kèm đáp án/lời giải</label>
          </div>
          {generated.length === 0 && <p className="muted">Chưa có mã đề. Hãy vào mục Tạo đề để sinh mã.</p>}
          {generated.map((code) => (
            <section className="exam" key={code.code}>
              <h2>Đề Toán lớp {mGrade} — Mã đề {String(code.code).padStart(2, '0')}</h2>
              <p className="meta">Thời gian: {duration} phút · Tổng điểm: {fmtPoints(code.rawPoints)} điểm · {examDateTime()}</p>
              {QTYPES.map((qt) => {
                const qs = code.questions.filter((q) => q.qtype === qt);
                if (!qs.length) return null;
                return (
                  <div key={qt}>
                    <h3>{QTYPE_LABEL[qt]}</h3>
                    {qs.map((q, i) => (
                      <article className="question" key={q.id}>
                        <p><strong>Câu {i + 1}.</strong> <MathText text={stripSourcePrefix(q.content)} /></p>
                        {q.options?.length > 0 && <div className={`options-grid cols-${optionLayout(q.options)}`}>{q.options.map((op, oi) => <span key={oi}><strong>{'ABCD'[oi] ?? oi + 1}.</strong> <MathText text={stripOptionPrefix(op)} /></span>)}</div>}
                        {showAnswers && <div className="answer"><p><strong>Đáp án:</strong> <MathText text={q.correct} /></p>{q.explanation && <p><strong>Lời giải:</strong> <MathText text={q.explanation} /></p>}</div>}
                      </article>
                    ))}
                  </div>
                );
              })}
            </section>
          ))}
        </main>
      )}

      {tab === 'assign' && (
        <main>
          <section className="card no-print">
            <h2>Lớp và học sinh</h2>
            {!canTeach && <p className="notice">Tính năng này dành cho giáo viên đã được cấp full tính năng (hoặc đang dùng thử 3 ngày).</p>}
            <div className="filters">
              <label>Tên lớp<input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="VD: 12A1" /></label>
              <label>Khối<select value={classGrade} onChange={(e) => setClassGrade(Number(e.target.value))}><option>10</option><option>11</option><option>12</option></select></label>
            </div>
            <label className="field">Danh sách học sinh, mỗi dòng một tên<textarea value={studentNames} onChange={(e) => setStudentNames(e.target.value)} rows={5} /></label>
            <button className="primary" onClick={() => void createClassAndStudents()}>Tạo lớp</button>
            <div className="grid">
              {classes.map((c) => <section className="card" key={c.id}><h3>{c.name}</h3><p className="meta">Khối {c.grade} · {students.filter((s) => s.class_id === c.id).length} học sinh</p>{students.filter((s) => s.class_id === c.id).slice(0, 8).map((s) => <p key={s.id}>{s.full_name}</p>)}</section>)}
            </div>
          </section>
          <section className="card no-print">
            <h2>Bài đã giao</h2>
            <button onClick={() => void loadTeacherData()}>Tải lại</button>
            {assignments.map((a) => {
              const ex = exams.find((e) => e.id === a.exam_id);
              return <article className="question" key={a.id}><p><strong>{a.title || ex?.title || 'Bài giao'}</strong> · Mã vào làm: <strong>{a.join_code}</strong> · {a.duration_minutes ?? ex?.duration_minutes ?? 45} phút</p><p className="meta">Đề #{a.exam_id} · {a.is_open ? 'Đang mở' : 'Đã đóng'} · {a.created_at ?? ''}</p><button onClick={() => { setJoinCode(a.join_code); setTab('take'); }}>Mở trang làm bài</button> <button onClick={() => { setResultAssignmentId(String(a.id)); setTab('results'); }}>Xem kết quả</button></article>;
            })}
          </section>
        </main>
      )}

      {tab === 'take' && (
        <main>
          <section className="card no-print">
            <h2>Học sinh làm bài</h2>
            <div className="filters">
              <label>Mã giao bài<input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="VD: ABC234" /></label>
              <label>Họ tên<input value={studentName} onChange={(e) => setStudentName(e.target.value)} /></label>
              <label>Lớp<input value={takeClassName} onChange={(e) => setTakeClassName(e.target.value)} placeholder="VD: 12A1" /></label>
              <button className="primary" onClick={() => void startTake()}>Vào làm bài</button>
            </div>
            {takeExam && <p className="notice">{takeExam.title} · Mã đề {takeCodeIndex + 1} · Thời gian {takeAssignment?.duration_minutes ?? takeExam.duration_minutes ?? 45} phút</p>}
            {takeResult && <p className="notice">{takeResult}</p>}
          </section>
          {takeQuestions.map((q, i) => (
            <article className="card" key={q.id}>
              <p className="meta">Câu {i + 1} · {QTYPE_LABEL[q.qtype]} · {fmtPoints(Number(q.points || 0))} điểm</p>
              <div className="content"><MathText text={q.content} /></div>
              {q.image_url && <img className="figure" src={q.image_url} alt="Hình minh họa" />}
              {q.qtype === 'single' && <div className="choices">{(q.options ?? []).map((op, oi) => <label className="check" key={oi}><input type="radio" name={`q-${q.id}`} checked={Number(answers[String(q.id)]) === oi} onChange={() => setAnswers({ ...answers, [String(q.id)]: oi })} /> <MathText text={op} /></label>)}</div>}
              {q.qtype === 'tf' && <div className="filters">{['a', 'b', 'c', 'd'].map((k) => <label key={k}>Ý {k}<select value={String(((answers[String(q.id)] as Record<string, string> | undefined)?.[k]) ?? '')} onChange={(e) => setAnswers({ ...answers, [String(q.id)]: { ...((answers[String(q.id)] as Record<string, string> | undefined) ?? {}), [k]: e.target.value } })}><option value="">Chọn</option><option>Đúng</option><option>Sai</option></select></label>)}</div>}
              {q.qtype === 'short' && <label className="field">Đáp án<input value={String(answers[String(q.id)] ?? '')} onChange={(e) => setAnswers({ ...answers, [String(q.id)]: e.target.value })} /></label>}
              {q.qtype === 'essay' && <label className="field">Bài làm tự luận<textarea rows={6} value={String(answers[String(q.id)] ?? '')} onChange={(e) => setAnswers({ ...answers, [String(q.id)]: e.target.value })} /></label>}
            </article>
          ))}
          {takeQuestions.length > 0 && <button className="primary no-print" onClick={() => void submitTake()}>Nộp bài</button>}
        </main>
      )}

      {tab === 'results' && (
        <main className="card no-print">
          <h2>Kết quả và thống kê</h2>
          {!canTeach && <p className="notice">Tính năng này dành cho giáo viên đã được cấp full tính năng (hoặc đang dùng thử 3 ngày).</p>}
          <div className="filters">
            <label>Bài giao<select value={resultAssignmentId} onChange={(e) => setResultAssignmentId(e.target.value)}>{assignments.map((a) => <option key={a.id} value={a.id}>{a.title || `Bài ${a.id}`} — {a.join_code}</option>)}</select></label>
            <button onClick={() => void loadSubmissions()}>Tải kết quả</button>
            <button onClick={exportResultsCsv} disabled={!submissions.length}>Xuất CSV</button>
          </div>
          {submissions.length > 0 && <p className="notice">Số bài nộp: {submissions.length} · Điểm trung bình: {(submissions.reduce((s, x) => s + Number(x.score ?? 0), 0) / submissions.length).toFixed(2)}</p>}
          <div className="tablewrap"><table><thead><tr><th>Học sinh</th><th>Lớp</th><th>Mã đề</th><th>Điểm</th><th>Tự luận</th><th>Trạng thái</th><th>Chấm tự luận</th></tr></thead><tbody>{submissions.map((s) => <tr key={s.id}><td>{s.student_name}</td><td>{s.class_name ?? ''}</td><td>{s.code_index + 1}</td><td>{s.score ?? '—'}</td><td>{s.essay_score ?? '—'}</td><td>{s.status ?? ''}</td><td><input type="number" step="0.25" value={essayScores[String(s.id)] ?? ''} onChange={(e) => setEssayScores({ ...essayScores, [String(s.id)]: e.target.value })} /> <button onClick={() => void gradeEssay(s)}>Lưu</button></td></tr>)}</tbody></table></div>
        </main>
      )}

      {tab === 'admin' && (
        <main className="card no-print">
          {isAdmin && (
            <section><h2>Quản trị tài khoản</h2><p>Quản trị nắm mọi quyền: cấp/thu hồi full tính năng, cấp quyền Toán tiếng Anh, đổi vai trò và gia hạn dùng thử.</p>
            {profiles.map((pr) => (
              <div className="filters" key={pr.user_id}><strong>{pr.email}</strong><span>{pr.role === 'admin' ? 'Quản trị' : pr.role === 'teacher' ? 'Giáo viên' : 'Học sinh'} · {pr.full_access ? 'Full' : new Date(pr.trial_ends_at).getTime() > Date.now() ? `Dùng thử đến ${new Date(pr.trial_ends_at).toLocaleDateString('vi-VN')}` : 'Giới hạn'} · Tiếng Anh: {pr.english_access || pr.full_access || pr.role === 'admin' ? 'Có' : pr.english_requested ? 'Đang yêu cầu' : 'Chưa'}</span>
              {pr.role !== 'admin' && <><button onClick={() => void updateProfile(pr.user_id, { full_access: !pr.full_access })}>{pr.full_access ? 'Thu hồi full' : 'Cấp full'}</button><button onClick={() => void updateProfile(pr.user_id, { english_access: !pr.english_access, english_requested: false })}>{pr.english_access ? 'Thu hồi tiếng Anh' : 'Cấp tiếng Anh'}</button><button onClick={() => void updateProfile(pr.user_id, { role: pr.role === 'teacher' ? 'student' : 'teacher' })}>Đổi vai trò</button><button onClick={() => void updateProfile(pr.user_id, { trial_ends_at: new Date(Date.now() + 3 * 86400000).toISOString() })}>Gia hạn 3 ngày</button></>}
              </div>
            ))}</section>
          )}
          <h2>Quản trị câu hỏi</h2>
          {!canTeach && <p className="notice">Tính năng này dành cho giáo viên đã được cấp full tính năng (hoặc đang dùng thử 3 ngày).</p>}
          <div className="filters">
            <label>ID câu<input value={adminForm.id} onChange={(e) => setAdminForm({ ...adminForm, id: e.target.value })} placeholder="Để trống để thêm mới" /></label>
            <button onClick={() => void loadAdminQuestion()}>Tải câu</button>
            <label>Lớp<select value={adminForm.grade} onChange={(e) => setAdminForm({ ...adminForm, grade: Number(e.target.value) })}><option>10</option><option>11</option><option>12</option></select></label>
            <label>Mức<select value={adminForm.level} onChange={(e) => setAdminForm({ ...adminForm, level: e.target.value })}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label>
            <label>Loại<select value={adminForm.qtype} onChange={(e) => setAdminForm({ ...adminForm, qtype: e.target.value })}>{QTYPES.map((q) => <option key={q} value={q}>{QTYPE_LABEL[q]}</option>)}</select></label>
            <label>Điểm<input type="number" step="0.25" value={adminForm.points} onChange={(e) => setAdminForm({ ...adminForm, points: Number(e.target.value) })} /></label>
          </div>
          <label className="field">Chương<input value={adminForm.chapter} onChange={(e) => setAdminForm({ ...adminForm, chapter: e.target.value })} /></label>
          <label className="field">Dạng<input value={adminForm.dang} onChange={(e) => setAdminForm({ ...adminForm, dang: e.target.value })} /></label>
          <label className="field">Nội dung<textarea rows={5} value={adminForm.content} onChange={(e) => setAdminForm({ ...adminForm, content: e.target.value })} /></label>
          <label className="field">Phương án, mỗi dòng một phương án<textarea rows={5} value={adminForm.options} onChange={(e) => setAdminForm({ ...adminForm, options: e.target.value })} /></label>
          <label className="field">Đáp án<input value={adminForm.correct} onChange={(e) => setAdminForm({ ...adminForm, correct: e.target.value })} /></label>
          <label className="field">Lời giải<textarea rows={5} value={adminForm.explanation} onChange={(e) => setAdminForm({ ...adminForm, explanation: e.target.value })} /></label>
          <div className="filters"><button className="primary" onClick={() => void saveAdminQuestion()}>Lưu câu hỏi</button><button onClick={() => void deleteAdminQuestion()}>Xóa câu</button></div>
          {matrixMsg && <p className="notice">{matrixMsg}</p>}
        </main>
      )}

      <button className="ai-bubble no-print" onClick={() => setAiOpen(!aiOpen)} aria-label="Mở chat AI">💬</button>
      {aiOpen && (
        <section className="ai-panel no-print">
          <div className="ai-head"><strong>Chat AI Toán</strong><span>{aiStatus}</span><button onClick={() => setAiOpen(false)}>×</button></div>
          <div className="ai-messages">{aiMessages.map((m, i) => <div key={i} className={`ai-msg ${m.role}`}><MathText text={m.content} /></div>)}{aiBusy && <div className="ai-msg assistant">AI đang trả lời…</div>}</div>
          <div className="ai-input"><textarea rows={2} value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder="Hỏi AI về bài toán, đề thi, cách giải…" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendAi(); } }} /><button className="primary" onClick={() => void sendAi()} disabled={aiBusy}>Gửi</button></div>
        </section>
      )}
    </div>
  );
}

function QuestionCard({ q, showAnswers }: { q: Question; showAnswers: boolean }) {
  return (
    <article className="card">
      <p className="meta">ID {q.id} · Lớp {q.grade} · {q.chapter} · Bài: {q.lesson || '—'} · Dạng: {q.dang} · {q.level} · {QTYPE_LABEL[q.qtype]} · {q.points} điểm</p>
      <div className="content"><MathText text={q.content} /></div>
      {q.image_url && <img className="figure" src={q.image_url} alt="Hình minh họa" />}
      {q.options?.length > 0 && <ol className="options">{q.options.map((op, i) => <li key={i}><MathText text={op} /></li>)}</ol>}
      {showAnswers && (
        <div className="answer">
          <p><strong>Đáp án:</strong> <MathText text={q.correct} /></p>
          <div><MathText text={q.explanation} /></div>
        </div>
      )}
    </article>
  );
}
