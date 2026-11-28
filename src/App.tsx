import { useEffect, useMemo, useState } from 'react';
import MathText from './MathText';
import { eqParams, getSession, ilike, isSupabaseConfigured, signIn, signOut, signUp, recoverPassword, resendConfirmation, updatePassword, supabaseCount, supabaseDelete, supabaseGet, supabaseInsert, supabaseUpdate, type AuthSession } from './supabase';
import { LEVELS, QTYPES, QTYPE_LABEL, type Assignment, type ClassRecord, type ExamRecord, type Level, type QType, type Question, type StudentRecord, type Submission, type TheoryNote } from './types';

type Tab = 'overview' | 'bank' | 'theory' | 'english' | 'matrix' | 'print' | 'assign' | 'take' | 'results' | 'admin' | 'users' | 'practice' | 'news' | 'games';

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

interface EnglishVocabulary { id: string; grade: number; lesson: string; lesson_vi: string; term: string; meaning: string; freq: number; ipa?: string; }


const NEWS_SOURCES = [
  { title: 'Tin tức Bộ Giáo dục và Đào tạo', desc: 'Tin hoạt động của Bộ, thông cáo báo chí, tin tổng hợp giáo dục.', url: 'https://moet.gov.vn/tin-tuc' },
  { title: 'Giáo dục trung học', desc: 'Tin và văn bản liên quan bậc trung học, trường phổ thông, sách giáo khoa.', url: 'https://moet.gov.vn/chuyen-de-giao-duc-va-dao-tao/giao-duc-trung-hoc?menuId=Article.DraftText&categoryId=15165247' },
  { title: 'Thi tốt nghiệp THPT và chính sách giáo dục', desc: 'Dự thảo quy chế thi, chính sách đột phá phát triển giáo dục.', url: 'https://moet.gov.vn/tin-tuc/nganh-giao-duc-thuc-hien-nghi-quyet-71-nq-tw-ve-dot-pha-phat-trien-giao-duc-va-dao-tao' },
];

const NEWS_ITEMS = [
  { title: 'Dự thảo Thông tư ban hành Quy chế thi tốt nghiệp THPT', date: '26/11/2026', tag: 'Thi tốt nghiệp', desc: 'Bộ GDĐT đăng tải dự thảo Thông tư Quy chế thi tốt nghiệp THPT để lấy ý kiến góp ý, tăng cường an ninh, an toàn kỳ thi.', url: 'https://moet.gov.vn/tin-tuc/nganh-giao-duc-thuc-hien-nghi-quyet-71-nq-tw-ve-dot-pha-phat-trien-giao-duc-va-dao-tao' },
  { title: 'Hội thảo Giáo dục 2026: Hoàn thiện chính sách, bảo đảm nguồn lực', date: '27/11/2026', tag: 'Chính sách', desc: 'Hội thảo tại Nhà Quốc hội về cơ chế, chính sách và nguồn lực thực hiện đột phá phát triển giáo dục và đào tạo.', url: 'https://moet.gov.vn/tin-tuc' },
  { title: 'Công văn hướng dẫn xây dựng văn hóa học đường', date: '2026', tag: 'Công văn', desc: 'Công văn của Bộ GDĐT hướng dẫn tổ chức Ngày Văn hóa Việt Nam gắn với xây dựng văn hóa học đường, gửi các sở GDĐT và cơ sở giáo dục.', url: 'https://moet.gov.vn/upload/2007219/20261103/30_10_26_cong-van-huong-dan-chi-thi-35-bgddt_2012_30101545_signed_5742_01111914_signed_4075_02110916_signed_5673_5cae3.pdf' },
  { title: '25 năm giáo dục hòa nhập tại Việt Nam', date: '26/11/2026', tag: 'Tin Bộ', desc: 'Hội thảo kỷ niệm 25 năm giáo dục hòa nhập, nhìn lại kết quả và định hướng phát triển trong thời gian tới.', url: 'https://moet.gov.vn/tin-tuc' },
  { title: 'Thông tư về SGK điện tử và dạy thêm, học thêm', date: '2026', tag: 'Trung học', desc: 'Tin giáo dục trung học: quy định chuyển thể SGK bản in sang SGK điện tử; sửa đổi quy định về dạy thêm, học thêm.', url: 'https://moet.gov.vn/chuyen-de-giao-duc-va-dao-tao/giao-duc-trung-hoc?menuId=Article.DraftText&categoryId=15165247' },
];

const ENGLISH_LESSONS: Record<number, string[]> = {
  10: ['Mệnh đề','Tập hợp','Các phép toán trên tập hợp','Bất phương trình bậc nhất hai ẩn','Hệ bất phương trình bậc nhất hai ẩn','Giá trị lượng giác của một góc từ 0° đến 180°','Hệ thức lượng trong tam giác','Các khái niệm mở đầu','Tổng và hiệu của hai vectơ','Tích của một vectơ với một số','Vectơ trong mặt phẳng tọa độ','Tích vô hướng của hai vectơ','Số gần đúng và sai số','Các số đặc trưng đo xu thế trung tâm','Các số đặc trưng đo độ phân tán','Hàm số','Hàm số bậc hai','Dấu của tam thức bậc hai','Phương trình quy về phương trình bậc hai','Phương trình đường thẳng','Vị trí tương đối giữa hai đường thẳng. Góc và khoảng cách','Đường tròn trong mặt phẳng tọa độ','Ba đường conic','Quy tắc đếm','Hoán vị, chỉnh hợp và tổ hợp','Nhị thức Newton','Biến cố và định nghĩa cổ điển của xác suất','Thực hành tính xác suất theo định nghĩa cổ điển','Hệ phương trình bậc nhất ba ẩn','Phương pháp quy nạp toán học. Nhị thức Newton','Ba đường conic và ứng dụng'],
  11: ['Giá trị lượng giác của góc lượng giác','Công thức lượng giác','Hàm số lượng giác','Phương trình lượng giác','Dãy số','Cấp số cộng','Cấp số nhân','Mẫu số liệu ghép nhóm','Các số đặc trưng đo xu thế trung tâm cho mẫu số liệu ghép nhóm','Đường thẳng và mặt phẳng trong không gian','Hai đường thẳng song song','Đường thẳng song song với mặt phẳng','Hai mặt phẳng song song','Phép chiếu song song','Giới hạn của dãy số','Giới hạn của hàm số','Hàm số liên tục','Lũy thừa với số mũ thực','Lôgarit','Hàm số mũ và hàm số lôgarit','Phương trình, bất phương trình mũ và lôgarit','Hai đường thẳng vuông góc','Đường thẳng vuông góc với mặt phẳng','Phép chiếu vuông góc. Góc giữa đường thẳng và mặt phẳng','Hai mặt phẳng vuông góc','Khoảng cách','Thể tích','Biến cố hợp, biến cố giao, biến cố độc lập','Công thức cộng xác suất','Công thức nhân xác suất cho hai biến cố độc lập','Định nghĩa và ý nghĩa của đạo hàm','Các quy tắc tính đạo hàm','Đạo hàm cấp hai','Phép biến hình trong mặt phẳng','Làm quen với một vài khái niệm của lí thuyết đồ thị','Một số yếu tố vẽ kĩ thuật'],
  12: ['Tính đơn điệu và cực trị của hàm số','Giá trị lớn nhất và giá trị nhỏ nhất của hàm số','Đường tiệm cận của đồ thị hàm số','Khảo sát sự biến thiên và vẽ đồ thị của hàm số','Ứng dụng đạo hàm để giải quyết một số vấn đề liên quan đến thực tiễn','Vectơ trong không gian','Hệ trục tọa độ trong không gian','Biểu thức toạ độ của các phép toán vectơ','Khoảng biến thiên và khoảng tứ phân vị','Phương sai và độ lệch chuẩn','Nguyên hàm','Tích phân','Ứng dụng hình học của tích phân','Phương trình mặt phẳng','Phương trình đường thẳng trong không gian','Phương trình mặt cầu','Công thức tính góc trong không gian','Xác suất có điều kiện','Công thức xác suất toàn phần và công thức Bayes'],
};

const GAME_MODES = [
  { id: 'speed', name: 'Đua Tốc Độ', icon: '🏎️', desc: 'Trả lời càng nhanh điểm càng cao', seconds: 20 },
  { id: 'climb', name: 'Leo Tháp Trí Tuệ', icon: '🗼', desc: 'Đúng leo lên, sai tụt xuống', seconds: 25 },
  { id: 'boss', name: 'Đấu Boss Toán Học', icon: '🐉', desc: 'Đúng làm boss mất máu', seconds: 25 },
  { id: 'wheel', name: 'Vòng Quay May Mắn', icon: '🎡', desc: 'Đúng quay nhân điểm x1-x3', seconds: 20 },
  { id: 'treasure', name: 'Săn Kho Báu', icon: '🗺️', desc: 'Mỗi câu đúng tiến một bước tới kho báu', seconds: 25 },
  { id: 'streak', name: 'Chuỗi Đúng Liên Hoàn', icon: '🔥', desc: 'Giữ chuỗi đúng để nhân điểm', seconds: 15 },
  { id: 'race', name: 'Đường Đua Tri Thức', icon: '🏁', desc: 'Đúng tăng tốc về đích', seconds: 20 },
  { id: 'mystery', name: 'Hộp Bí Mật', icon: '🎁', desc: 'Đúng mở hộp nhận điểm thưởng bí mật', seconds: 20 },
  { id: 'survival', name: 'Sinh Tồn 3 Mạng', icon: '❤️', desc: 'Sai mất một mạng, hết mạng là thua', seconds: 20, lives: 3 },
  { id: 'timeattack', name: 'Thử Thách 120 Giây', icon: '⏱️', desc: 'Làm nhiều câu nhất trong 120 giây', seconds: 120, total: true },
  { id: 'match', name: 'Ghép Đôi Siêu Tốc', icon: '⚡', desc: '10 giây cho mỗi câu', seconds: 10 },
  { id: 'tower', name: 'Phòng Thủ Tháp', icon: '🏰', desc: 'Sai tháp mất máu, bảo vệ tháp đến cuối', seconds: 20, lives: 5 },
  { id: 'stars', name: 'Săn Sao Vàng', icon: '⭐', desc: 'Mỗi câu đúng thu một ngôi sao', seconds: 20 },
  { id: 'sixty', name: 'Thử Thách 60 Giây', icon: '⏰', desc: '60 giây chạy đua với thời gian', seconds: 60, total: true },
  { id: 'lightning', name: 'Vua Tia Chớp', icon: '🌩️', desc: '5 giây mỗi câu, chỉ dành cho cao thủ', seconds: 5 },
] as const;

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
  rightarrow: '→', to: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', iff: '⇔', implies: '⇒', mapsto: '↦', angle: '∠', perp: '⊥', parallel: '∥', triangle: '△', sim: '∼', simeq: '≃', cong: '≅', equiv: '≡', propto: '∝', forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨', mid: '∣', nmid: '∤', prime: '′', circ: '∘', bullet: '•', cdots: '⋯', ldots: '…', dots: '…', vdots: '⋮', ddots: '⋱', degree: '°', circled: '°', ell: 'ℓ', ast: '∗', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', langle: '⟨', rangle: '⟩', nabla: '∇', partial: '∂', nexists: '∄', gtrsim: '≳', lesssim: '≲', nless: '≮', ngtr: '≯', nearrow: '↗', searrow: '↘', nwarrow: '↖', swarrow: '↙', frown: '⌢', longrightarrow: '⟶', longleftarrow: '⟵', longleftrightarrow: '⟷', hookrightarrow: '↪', uparrow: '↑', downarrow: '↓', hbar: 'ħ',
};
const MATH_FUNCS = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'ln', 'log', 'exp', 'lim', 'min', 'max', 'sup', 'inf', 'det', 'gcd', 'lcm', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'mod', 'lg']);

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
  function readArg(): string {
    if (peek() === '{') return readGroup();
    const ch = peek();
    if (/[0-9a-zA-Z]/.test(ch)) { i++; return mRun(ch); }
    return parsePrimary();
  }
  function skipLimits(): void {
    if (s.startsWith('\\limits', i)) i += 7;
    else if (s.startsWith('\\nolimits', i)) i += 9;
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
      if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') { const num = readArg(); const den = readArg(); return `<m:f><m:fPr><m:type m:val="bar"/></m:fPr><m:num>${num}</m:num><m:den>${den}</m:den></m:f>`; }
      if (cmd === 'sqrt') { const deg = readBracket(); const e = readArg(); return `<m:rad><m:radPr>${deg ? '' : '<m:degHide m:val="1"/>'}</m:radPr><m:deg>${deg}</m:deg><m:e>${e}</m:e></m:rad>`; }
      if (cmd === 'sum' || cmd === 'prod' || cmd === 'int' || cmd === 'iint' || cmd === 'oint') {
        const chr = cmd === 'sum' ? '∑' : cmd === 'prod' ? '∏' : cmd === 'oint' ? '∮' : cmd === 'iint' ? '∬' : '∫';
        let sub = ''; let sup = '';
        skipLimits();
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
        let bodyRaw = raw;
        if (env === 'array') bodyRaw = bodyRaw.replace(/^\s*\{[^{}]*\}/, '');
        const rows = bodyRaw.split(/\\\\/).map((r) => r.replace(/\\hline/g, '').trim()).filter(Boolean);
        if (env === 'aligned' || env === 'align' || env === 'gathered' || env === 'eqnarray') {
          const eqRows = rows.map((r) => `<m:e>${latexToOmmlInner(r.replace(/&/g, ''))}</m:e>`).join('');
          return `<m:eqArr>${eqRows}</m:eqArr>`;
        }
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
      if (cmd === 'text' || cmd === 'mathrm' || cmd === 'textbf' || cmd === 'textit' || cmd === 'operatorname') {
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
      if (cmd === 'overrightarrow') return `<m:acc><m:accPr><m:chr m:val="\u{20D7}"/></m:accPr><m:e>${readGroup()}</m:e></m:acc>`;
      if (cmd === 'overleftarrow') return `<m:acc><m:accPr><m:chr m:val="\u{20D6}"/></m:accPr><m:e>${readGroup()}</m:e></m:acc>`;
      if (cmd === 'overleftrightarrow') return `<m:acc><m:accPr><m:chr m:val="\u{20E1}"/></m:accPr><m:e>${readGroup()}</m:e></m:acc>`;
      if (cmd === 'widehat') return `<m:acc><m:accPr><m:chr m:val="\u{0302}"/></m:accPr><m:e>${readGroup()}</m:e></m:acc>`;
      if (cmd === 'widetilde') return `<m:acc><m:accPr><m:chr m:val="\u{0303}"/></m:accPr><m:e>${readGroup()}</m:e></m:acc>`;
      if (cmd === 'binom' || cmd === 'dbinom' || cmd === 'tbinom') { const num = readArg(); const den = readArg(); return `<m:d><m:dPr><m:begChr m:val="("/><m:endChr m:val=")"/></m:dPr><m:e><m:f><m:fPr><m:type m:val="noBar"/></m:fPr><m:num>${num}</m:num><m:den>${den}</m:den></m:f></m:e></m:d>`; }
      if (cmd === 'overset') { const lim = readArg(); const e = readArg(); return `<m:limUpp><m:e>${e}</m:e><m:lim>${lim}</m:lim></m:limUpp>`; }
      if (cmd === 'underset') { const lim = readArg(); const e = readArg(); return `<m:limLow><m:e>${e}</m:e><m:lim>${lim}</m:lim></m:limLow>`; }
      if (cmd === 'overbrace') return `<m:groupChr><m:groupChrPr><m:chr m:val="\u{23DE}"/><m:pos m:val="top"/></m:groupChrPr><m:e>${readGroup()}</m:e></m:groupChr>`;
      if (cmd === 'underbrace') return `<m:groupChr><m:groupChrPr><m:chr m:val="\u{23DF}"/><m:pos m:val="bot"/></m:groupChrPr><m:e>${readGroup()}</m:e></m:groupChr>`;
      if (cmd === 'pmod') return `${mRun(' (mod ', true)}${readArg()}${mRun(')', true)}`;
      if (cmd === 'not') {
        const nx = peek();
        if (nx === '=') { i++; return mRun('≠'); }
        if (nx === '<') { i++; return mRun('≮'); }
        if (nx === '>') { i++; return mRun('≯'); }
        if (s.startsWith('\\in', i) && !/[a-zA-Z]/.test(s[i + 3] ?? '')) { i += 3; return mRun('∉'); }
        if (s.startsWith('\\subset', i)) { i += 7; return mRun('⊄'); }
        if (s.startsWith('\\equiv', i)) { i += 6; return mRun('≢'); }
        if (/[0-9a-zA-Z]/.test(nx)) { i++; return mRun(nx + '\u{0338}'); }
        return parsePrimary();
      }
      if (cmd === 'big' || cmd === 'Big' || cmd === 'bigg' || cmd === 'Bigg' || cmd === 'bigl' || cmd === 'bigr' || cmd === 'Bigl' || cmd === 'Bigr' || cmd === 'biggl' || cmd === 'biggr' || cmd === 'Biggl' || cmd === 'Biggr' || cmd === 'middle') return parsePrimary();
      if (cmd === 'limits' || cmd === 'nolimits') return mRun('\u{200B}');
      if (cmd === 'displaystyle' || cmd === 'textstyle' || cmd === 'scriptstyle' || cmd === 'scriptscriptstyle') return parseTerm();
      if (cmd === 'lim') { let sub = ''; skipLimits(); if (peek() === '_') { i++; sub = readGroup(); } return sub ? `<m:sSub><m:e>${mRun('lim', true)}</m:e><m:sub>${sub}</m:sub></m:sSub>` : mRun('lim', true); }
      if (MATH_FUNCS.has(cmd)) return mRun(cmd, true);
      if (MATH_SYMBOLS[cmd]) return mRun(MATH_SYMBOLS[cmd]);
      if (cmd === 'quad' || cmd === 'qquad') return mRun('  ');
      if (peek() === '{') return readGroup();
      const known = [...Object.keys(MATH_SYMBOLS), ...MATH_FUNCS].filter((k) => cmd.length > k.length && cmd.startsWith(k)).sort((a, b) => b.length - a.length)[0];
      if (known) { const head = MATH_SYMBOLS[known] ? mRun(MATH_SYMBOLS[known]) : mRun(known, true); return head + [...cmd.slice(known.length)].map((c) => mRun(c)).join(''); }
      return mRun(cmd);
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
  while (i < s.length) { if (peek() === '}') { i++; continue; } out += parseTerm(); }
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

function standardCells(levelNeed: Record<Level, number>, partNeed: Record<QType, number>, partPoints: Record<QType, number>): Record<Level, Record<QType, number>> | null {
  if (partNeed.single !== 12 || partNeed.tf !== 4 || partNeed.short !== 4 || partNeed.essay !== 4) return null;
  if (partPoints.single !== 3 || partPoints.tf !== 3 || partPoints.short !== 2 || partPoints.essay !== 2) return null;
  if (levelNeed.NB !== 12 || levelNeed.TH !== 7 || levelNeed.VD !== 3 || levelNeed.VDC !== 2) return null;
  return {
    NB: { single: 8, tf: 0, short: 2, essay: 2 },
    TH: { single: 4, tf: 2, short: 1, essay: 0 },
    VD: { single: 0, tf: 1, short: 1, essay: 1 },
    VDC: { single: 0, tf: 1, short: 0, essay: 1 },
  };
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
  const [examLang, setExamLang] = useState<'vi' | 'en'>('vi');
  const [scopeMode, setScopeMode] = useState<'all' | 'chapter' | 'lesson'>('all');
  const [mChapter, setMChapter] = useState('');
  const [mLesson, setMLesson] = useState('');
  const [scopeChapters, setScopeChapters] = useState<{ name: string; count: number }[]>([]);
  const [scopeLessons, setScopeLessons] = useState<{ name: string; base: string; count: number }[]>([]);
  const [numCodes, setNumCodes] = useState(4);
  const [levelNeed, setLevelNeed] = useState<Record<Level, number>>({ NB: 12, TH: 7, VD: 3, VDC: 2 });
  const [partNeed, setPartNeed] = useState<Record<QType, number>>({ single: 12, tf: 4, short: 4, essay: 4 });
  const [partPoints, setPartPoints] = useState<Record<QType, number>>({ single: 3, tf: 3, short: 2, essay: 2 });
  const [generated, setGenerated] = useState<GeneratedCode[]>([]);
  const [matrixMsg, setMatrixMsg] = useState('');
  const [session, setSession] = useState<AuthSession | null>(() => getSession());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authRole, setAuthRole] = useState<'student' | 'teacher'>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [practiceMode, setPracticeMode] = useState<'vi' | 'en'>('vi');
  const [practiceGrade, setPracticeGrade] = useState('12');
  const [practiceLevel, setPracticeLevel] = useState('');
  const [practiceQs, setPracticeQs] = useState<{ content: string; options: string[]; correctIndex: number; explanation: string; meta?: string }[]>([]);
  const [practiceCount, setPracticeCount] = useState(10);
  const [practiceLesson, setPracticeLesson] = useState('');
  const [practiceSeconds, setPracticeSeconds] = useState(0);
  const [practiceWrongOnly, setPracticeWrongOnly] = useState(false);
  const [newsQuery, setNewsQuery] = useState('');
  const [practiceHistory, setPracticeHistory] = useState<{ date: string; mode: string; grade: string; correct: number; total: number; seconds: number }[]>(() => { try { return JSON.parse(localStorage.getItem('practice-history') || '[]'); } catch { return []; } });
  const [gameModeId, setGameModeId] = useState<string>('speed');
  const [gameLang, setGameLang] = useState<'vi' | 'en'>('vi');
  const [gameGrade, setGameGrade] = useState(10);
  const [gameLevel, setGameLevel] = useState('');
  const [gameQs, setGameQs] = useState<{ content: string; options: string[]; correctIndex: number; explanation: string; meta: string }[]>([]);
  const [gameIdx, setGameIdx] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const [gameStreak, setGameStreak] = useState(0);
  const [gameLives, setGameLives] = useState(3);
  const [gameTimeLeft, setGameTimeLeft] = useState(20);
  const [gamePicked, setGamePicked] = useState<number | null>(null);
  const [gameDone, setGameDone] = useState(false);
  const [gameCorrect, setGameCorrect] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [gameBest, setGameBest] = useState<Record<string, number>>(() => { try { return JSON.parse(localStorage.getItem('game-best') || '{}'); } catch { return {}; } });
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, number>>({});
  const [practiceChecked, setPracticeChecked] = useState(false);
  const [userFilter, setUserFilter] = useState<'all' | 'student' | 'teacher' | 'trial' | 'full' | 'english' | 'requested' | 'limited'>('all');
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
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([{ role: 'assistant', content: 'Thầy hỏi em về bài toán, cách tạo đề hoặc gửi ảnh bài tập để em giải nhé.' }]);
  const [aiImage, setAiImage] = useState<{ mimeType: string; data: string; preview: string } | null>(null);
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

  function speakTerm(term: string, rate = 0.9) {
    try {
      const u = new SpeechSynthesisUtterance(term);
      u.lang = 'en-US'; u.rate = rate;
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    } catch { /* trình duyệt không hỗ trợ phát âm */ }
  }

  function toggleMastered(id: string) {
    setMastered((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); localStorage.setItem('english-vocab-mastered', JSON.stringify(Array.from(next))); return next; });
  }

  function correctIndexOf(correct: string, options: string[]): number {
    const c = String(correct || '').trim();
    const m = c.match(/^[A-D]/i);
    if (m) return 'ABCD'.indexOf(m[0].toUpperCase());
    const norm = (x: string) => x.replace(/^[A-D][.)]\s*/i, '').replace(/\$/g, '').trim().toLowerCase();
    const idx = options.findIndex((o) => norm(o) === norm(c) || norm(o).includes(norm(c)) || norm(c).includes(norm(o)));
    return idx >= 0 ? idx : 0;
  }

  useEffect(() => {
    if (!practiceQs.length || practiceChecked) return;
    const t = setInterval(() => setPracticeSeconds((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [practiceQs.length, practiceChecked]);

  function submitPractice() {
    const correct = practiceQs.filter((q, i) => practiceAnswers[i] === q.correctIndex).length;
    const entry = { date: new Date().toLocaleString('vi-VN'), mode: practiceMode === 'en' ? 'Tiếng Anh' : 'Tiếng Việt', grade: practiceGrade, correct, total: practiceQs.length, seconds: practiceSeconds };
    const next = [entry, ...practiceHistory].slice(0, 20);
    setPracticeHistory(next);
    try { localStorage.setItem('practice-history', JSON.stringify(next)); } catch { /* ignore */ }
    setPracticeChecked(true);
  }

  function retryWrong() {
    const wrong = practiceQs.filter((q, i) => practiceAnswers[i] !== q.correctIndex);
    if (!wrong.length) return;
    setPracticeQs(wrong); setPracticeAnswers({}); setPracticeChecked(false); setPracticeSeconds(0); setPracticeWrongOnly(false);
  }

  function playSound(kind: 'correct' | 'wrong' | 'win' | 'click') {
    if (!soundOn) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const notes: Record<string, number[]> = { correct: [880, 1320], wrong: [220, 160], win: [523, 659, 784, 1047], click: [600] };
      notes[kind].forEach((f, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = f; o.type = kind === 'wrong' ? 'sawtooth' : 'sine'; g.gain.value = 0.12; o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i * 0.09); o.stop(ctx.currentTime + i * 0.09 + 0.16); });
    } catch { /* sound optional */ }
  }

  async function startGame(modeId: string) {
    const mode = GAME_MODES.find((m) => m.id === modeId) ?? GAME_MODES[0];
    setGameModeId(modeId); setLoading(true); setError(''); setGameDone(false); setGamePicked(null); setGameIdx(0); setGameScore(0); setGameStreak(0); setGameCorrect(0); setGameLives('lives' in mode ? mode.lives : 99); setGameTimeLeft(mode.seconds);
    try {
      if (gameLang === 'en' && !hasEnglish) { setError('Toán tiếng Anh cần quyền truy cập hoặc đang dùng thử.'); return; }
      const table = gameLang === 'en' ? 'english_questions' : 'questions';
      const p = eqParams({ grade: gameGrade, qtype: 'single', level: gameLevel || undefined });
      const total = await supabaseCount(table, p, gameLang === 'en');
      if (!total) { setError('Chưa có câu trắc nghiệm khớp lựa chọn.'); return; }
      p.set('select', '*'); p.set('limit', '60'); p.set('offset', String(Math.floor(Math.random() * Math.max(1, total - 60))));
      if (gameLang === 'en') {
        const rows = await supabaseGet<EnglishQuestion[]>(table, p, true);
        setGameQs([...rows].sort(() => Math.random() - 0.5).filter((r) => r.options?.length >= 2).slice(0, 15).map((r) => ({ content: r.problem, options: r.options, correctIndex: correctIndexOf(r.answer, r.options), explanation: r.solution_en, meta: `${r.lesson_vi} • ${r.level}` })));
      } else {
        const rows = await supabaseGet<Question[]>(table, p);
        setGameQs([...rows].sort(() => Math.random() - 0.5).filter((r) => r.options?.length >= 2).slice(0, 15).map((r) => ({ content: stripSourcePrefix(r.content), options: r.options.map(stripOptionPrefix), correctIndex: correctIndexOf(r.correct, r.options), explanation: r.explanation || `Đáp án: ${r.correct}`, meta: `${r.lesson || ''} • ${r.level}` })));
      }
      playSound('click');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }

  function answerGame(i: number) {
    if (gamePicked !== null || gameDone || !gameQs[gameIdx]) return;
    const mode = GAME_MODES.find((m) => m.id === gameModeId) ?? GAME_MODES[0];
    const ok = i === gameQs[gameIdx].correctIndex;
    setGamePicked(i);
    let score = gameScore; let lives = gameLives; let streak = gameStreak; let correct = gameCorrect;
    if (ok) {
      correct += 1; streak += 1;
      let pts = 100;
      if (mode.id === 'speed' || mode.id === 'match' || mode.id === 'lightning') pts += gameTimeLeft * 10;
      if (mode.id === 'streak') pts += streak * 20;
      if (mode.id === 'wheel') pts *= 1 + Math.floor(Math.random() * 3);
      if (mode.id === 'mystery') pts += Math.floor(Math.random() * 101);
      score += pts; playSound('correct');
    } else {
      streak = 0; lives -= 1; playSound('wrong');
    }
    setGameScore(score); setGameStreak(streak); setGameLives(lives); setGameCorrect(correct);
    setTimeout(() => {
      if (lives <= 0 || gameIdx + 1 >= gameQs.length) {
        setGameDone(true); playSound('win');
        setGameBest((prev) => { const next = { ...prev, [mode.id]: Math.max(prev[mode.id] ?? 0, score) }; localStorage.setItem('game-best', JSON.stringify(next)); return next; });
      } else {
        setGameIdx(gameIdx + 1); setGamePicked(null);
        if (!('total' in mode && mode.total)) setGameTimeLeft(mode.seconds);
      }
    }, 1000);
  }

  useEffect(() => {
    if (!gameQs.length || gameDone || gamePicked !== null) return;
    const t = setInterval(() => setGameTimeLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [gameQs, gameDone, gamePicked, gameIdx]);

  useEffect(() => {
    if (gameQs.length && !gameDone && gamePicked === null && gameTimeLeft === 0) answerGame(-1);
  }, [gameTimeLeft]);

  async function startPractice() {
    setLoading(true); setError(''); setPracticeChecked(false); setPracticeAnswers({}); setPracticeSeconds(0); setPracticeWrongOnly(false);
    try {
      if (practiceMode === 'en' && !hasEnglish) { setError('Toán tiếng Anh cần quyền truy cập hoặc đang dùng thử.'); return; }
      const table = practiceMode === 'en' ? 'english_questions' : 'questions';
      const p = eqParams({ grade: practiceGrade, qtype: 'single', level: practiceLevel || undefined, ...(practiceMode === 'en' ? { lesson_vi: practiceLesson || undefined } : { lesson: practiceLesson || undefined }) });
      const total = await supabaseCount(table, p, practiceMode === 'en');
      if (!total) { setPracticeQs([]); setError('Chưa có câu trắc nghiệm khớp lựa chọn.'); return; }
      const offset = Math.floor(Math.random() * Math.max(1, total - practiceCount));
      p.set('select', '*'); p.set('limit', String(practiceCount * 3)); p.set('offset', String(offset));
      if (practiceMode === 'en') {
        const rows = await supabaseGet<EnglishQuestion[]>(table, p, true);
        const qs = [...rows].sort(() => Math.random() - 0.5).filter((r) => r.options?.length >= 2).slice(0, practiceCount).map((r) => ({ content: r.problem, options: r.options, correctIndex: correctIndexOf(r.answer, r.options), explanation: `${r.solution_en} ${r.solution_vi}`, meta: `${r.lesson_vi} • ${r.dang_vi} • ${r.level}` }));
        setPracticeQs(qs);
      } else {
        const rows = await supabaseGet<Question[]>(table, p);
        const qs = [...rows].sort(() => Math.random() - 0.5).filter((r) => r.options?.length >= 2).slice(0, practiceCount).map((r) => ({ content: stripSourcePrefix(r.content), options: r.options.map(stripOptionPrefix), correctIndex: correctIndexOf(r.correct, r.options), explanation: r.explanation || `Đáp án: ${r.correct}`, meta: `${r.lesson || ''} • ${r.dang} • ${r.level}` }));
        setPracticeQs(qs);
      }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
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
      lessons.sort((a, b) => { const ia = ENGLISH_LESSONS[mGrade].indexOf(lessonTitle(a.name)); const ib = ENGLISH_LESSONS[mGrade].indexOf(lessonTitle(b.name)); if (ia >= 0 && ib >= 0) return ia - ib; if (ia >= 0) return -1; if (ib >= 0) return 1; return a.name.localeCompare(b.name, 'vi'); });
      setScopeChapters(chapters);
      setScopeLessons(lessons);
      if (!mChapter && chapters[0]) setMChapter(chapters[0].name);
      if (!mLesson && lessons[0]) setMLesson(lessons[0].name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function loadScopedPool(): Promise<Question[]> {
    if (examLang === 'en') {
      const ep = eqParams({ grade: mGrade });
      ep.set('select', '*'); ep.set('order', 'id.asc');
      const erows: EnglishQuestion[] = [];
      for (let offset = 0; ; offset += 1000) {
        const pp = new URLSearchParams(ep); pp.set('limit', '1000'); pp.set('offset', String(offset));
        const rows = await supabaseGet<EnglishQuestion[]>('english_questions', pp, true);
        erows.push(...rows);
        if (rows.length < 1000) break;
      }
      let pool = erows;
      if (scopeMode === 'lesson') pool = pool.filter((q) => q.lesson_vi === lessonTitle(mLesson));
      if (scopeMode === 'chapter') { const titles = new Set(scopeLessons.filter((l) => baseChapter(l.name) === mChapter).map((l) => lessonTitle(l.name))); pool = pool.filter((q) => titles.has(q.lesson_vi)); }
      return pool.map((q) => ({ id: 900000000 + q.id, grade: q.grade, chapter: q.lesson_vi, lesson: q.lesson_vi, dang: q.dang, level: q.level as Level, qtype: q.qtype, content: q.problem, options: q.options ?? [], correct: q.answer, explanation: q.solution_en, points: 0 }));
    }
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
        const std = standardCells(levelNeed, partNeed, partPoints);
        const cells = std && LEVELS.every((l) => QTYPES.every((q) => capacity[l][q] >= std[l][q])) ? std : buildCellCounts(levelNeed, partNeed, capacity);
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

  async function handleRecover() {
    if (!email.trim()) { setError('Nhập email rồi bấm Quên mật khẩu nhé.'); return; }
    try { await recoverPassword(email.trim()); setMatrixMsg('Đã gửi email đặt lại mật khẩu. Kiểm tra hộp thư nhé.'); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  async function handleResend() {
    if (!email.trim()) { setError('Nhập email rồi bấm Gửi lại email xác nhận nhé.'); return; }
    try { await resendConfirmation(email.trim()); setMatrixMsg('Đã gửi lại email xác nhận tài khoản.'); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  async function handleNewPassword() {
    if (!recoveryToken || password.length < 6) { setError('Mật khẩu mới cần ít nhất 6 ký tự.'); return; }
    try { await updatePassword(recoveryToken, password); setRecoveryToken(''); window.history.replaceState(null, '', window.location.pathname); setMatrixMsg('Đã đổi mật khẩu. Đăng nhập bằng mật khẩu mới nhé.'); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
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
  useEffect(() => { const h = new URLSearchParams(window.location.hash.replace(/^#/, '')); if (h.get('type') === 'recovery' && h.get('access_token')) { setRecoveryToken(h.get('access_token') ?? ''); setMatrixMsg('Nhập mật khẩu mới rồi bấm Đặt mật khẩu mới nhé.'); } }, []);
  useEffect(() => { if (session) { void loadProfile(); } else setProfile(null); }, [session]);
  useEffect(() => { if (session && canTeach) void loadTeacherData(); }, [session, canTeach]);
  useEffect(() => { if ((tab === 'admin' || tab === 'users') && isAdmin) void loadProfiles(); }, [tab, isAdmin]);
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

  function pickAiImage(file: File) {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', 0.85);
      setAiImage({ mimeType: 'image/jpeg', data: url.split(',')[1] ?? '', preview: url });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  }

  async function sendAi() {
    const text = aiInput.trim() || (aiImage ? 'Giải bài tập trong ảnh này giúp em, trình bày lời giải rõ ràng.' : '');
    if (!text || aiBusy) return;
    const next = [...aiMessages, { role: 'user' as const, content: aiImage ? `${text} (kèm ảnh bài tập)` : text }];
    const image = aiImage ? { mimeType: aiImage.mimeType, data: aiImage.data } : undefined;
    setAiMessages(next);
    setAiInput('');
    setAiImage(null);
    setAiBusy(true);
    try {
      const res = await fetch('/api/ai-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next, context: aiContext(), image }) });
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
          {([['overview', 'Tổng quan'], ['bank', 'Ngân hàng câu hỏi'], ['theory', 'Lý thuyết'], ['english', 'Toán tiếng Anh'], ['matrix', 'Tạo đề'], ['print', 'In đề'], ['assign', 'Giao bài'], ['take', 'Học sinh làm bài'], ['results', 'Kết quả'], ['practice', 'Tự luyện'], ['games', 'Trò chơi'], ['news', 'Tin giáo dục'], ['admin', 'Quản trị'], ...(isAdmin ? [['users', 'Quản lý người dùng'] as [Tab, string]] : [])] as [Tab, string][]).map(([t, label]) => (
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
            <label>Mật khẩu<input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mật khẩu" /></label><button onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</button>
            <label>Vai trò đăng ký<select value={authRole} onChange={(e) => setAuthRole(e.target.value as 'student' | 'teacher')}><option value="student">Học sinh</option><option value="teacher">Giáo viên</option></select></label>
            <button className="primary" onClick={() => void handleSignIn()}>Đăng nhập</button>
            <button onClick={() => void handleSignUp()}>Đăng ký</button><button onClick={() => void handleRecover()}>Quên mật khẩu</button><button onClick={() => void handleResend()}>Gửi lại email xác nhận</button>{recoveryToken && <button className="primary" onClick={() => void handleNewPassword()}>Đặt mật khẩu mới</button>}
            <span>Tài khoản mới được dùng thử full tính năng 3 ngày. Mật khẩu được mã hóa một chiều, app không lưu mật khẩu gốc.</span>
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
                <h2>{v.term} {v.ipa && <span className="muted">{v.ipa}</span>}</h2><p><strong>Nghĩa:</strong> {v.meaning}</p><div className="filters"><button onClick={() => speakTerm(v.term)}>🔊 Nghe</button><button onClick={() => speakTerm(v.term, 0.6)}>Nghe chậm</button></div>
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
            <label>Ngôn ngữ đề<select value={examLang} onChange={(e) => setExamLang(e.target.value as 'vi' | 'en')}><option value="vi">Tiếng Việt</option><option value="en">Tiếng Anh</option></select></label>
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
          {examLang === 'en' && <p className="muted">Đề tiếng Anh lấy từ kho Toán tiếng Anh theo đúng ma trận mức × phần; thầy in hoặc xuất file trực tiếp ở mục In đề.</p>}
          {(() => { const cap = {} as Record<Level, Record<QType, number>>; for (const l of LEVELS) { cap[l] = {} as Record<QType, number>; for (const q of QTYPES) cap[l][q] = 999; } const cells = standardCells(levelNeed, partNeed, partPoints) ?? buildCellCounts(levelNeed, partNeed, cap);
            const groups: { key: string; label: string; levels: Level[] }[] = [{ key: 'B', label: 'Biết', levels: ['NB'] }, { key: 'H', label: 'Hiểu', levels: ['TH'] }, { key: 'VD', label: 'VD', levels: ['VD', 'VDC'] }];
            const partGroup: Record<QType, string> = { single: 'TNKQ nhiều lựa chọn', tf: 'TNKQ đúng - sai', short: 'TNKQ trả lời ngắn', essay: 'Tự luận' };
            const codeOf: Record<QType, string> = { single: 'TNNLC', tf: 'TNĐS', short: 'TLN', essay: 'TL' };
            const yeuCau: Record<string, string> = { B: 'Nhận biết: nhận biết được các khái niệm, định nghĩa, tính chất cơ bản của nội dung.', H: 'Thông hiểu: hiểu và áp dụng trực tiếp kiến thức, tính chất vào bài toán quen thuộc.', VD: 'Vận dụng: vận dụng kiến thức để giải quyết bài toán, kể cả bài toán thực tiễn.' };
            const lessonsAll = scopeLessons.filter((l) => scopeMode === 'all' || (scopeMode === 'chapter' ? baseChapter(l.name) === mChapter : lessonTitle(l.name) === lessonTitle(mLesson)));
            const lessons = lessonsAll.length ? lessonsAll : [{ name: lessonTitle(mLesson) || `Toàn khối ${mGrade}`, count: 0 }];
            const dist: Record<string, number>[] = lessons.map(() => ({}));
            if (cells) { let seed = 0; for (const q of QTYPES) { for (const g of groups) { const total = g.levels.reduce((a, l) => a + cells[l][q], 0); for (let i = 0; i < total; i++) { const idx = (seed + i) % lessons.length; dist[idx][`${q}|${g.key}`] = (dist[idx][`${q}|${g.key}`] ?? 0) + 1; } seed += 1; } } }
            const ptsOf = (i: number, q: QType, gk: string) => (partNeed[q] > 0 ? (dist[i][`${q}|${gk}`] ?? 0) * (partPoints[q] / partNeed[q]) : 0);
            const totalPts = QTYPES.reduce((a, q) => a + (partNeed[q] > 0 ? partPoints[q] : 0), 0);
            const pct = (v: number) => `${(totalPts > 0 ? (v / totalPts) * 100 : 0).toFixed(1).replace('.', ',')}%`;
            const chapters: { name: string; idx: number[] }[] = [];
            lessons.forEach((l, i) => { const ch = baseChapter(l.name) || l.name; const f = chapters.find((c) => c.name === ch); if (f) f.idx.push(i); else chapters.push({ name: ch, idx: [i] }); });
            return (<>
            <h3>Ma trận đề</h3>
            <div style={{ overflowX: 'auto' }}><table><thead>
              <tr><th rowSpan={3}>TT</th><th rowSpan={3}>Chương/chủ đề</th><th rowSpan={3}>Nội dung/đơn vị kiến thức</th><th colSpan={12}>Mức độ đánh giá</th><th colSpan={3}>Tổng</th><th rowSpan={3}>Tỉ lệ % điểm</th></tr>
              <tr>{QTYPES.map((q) => <th key={q} colSpan={3}>{partGroup[q]}</th>)}<th colSpan={3}></th></tr>
              <tr>{QTYPES.flatMap((q) => groups.map((g) => <th key={`${q}${g.key}`}>{g.label}</th>))}{groups.map((g) => <th key={g.key}>{g.label}</th>)}</tr>
            </thead><tbody>
              {chapters.map((ch, ci) => ch.idx.map((i, ri) => { const lp = QTYPES.reduce((a, q) => a + groups.reduce((b, g) => b + ptsOf(i, q, g.key), 0), 0); return (<tr key={i}>{ri === 0 && <td rowSpan={ch.idx.length}>{ci + 1}</td>}{ri === 0 && <td rowSpan={ch.idx.length}>{ch.name}</td>}<td>{lessonTitle(lessons[i].name) || lessons[i].name}</td>{QTYPES.flatMap((q) => groups.map((g) => <td key={`${q}${g.key}`}>{dist[i][`${q}|${g.key}`] || ''}</td>))}{groups.map((g) => <td key={g.key}><strong>{QTYPES.reduce((a, q) => a + (dist[i][`${q}|${g.key}`] ?? 0), 0) || ''}</strong></td>)}<td>{pct(lp)}</td></tr>); }))}
              <tr><td colSpan={3}><strong>Tổng số câu</strong></td>{QTYPES.flatMap((q) => groups.map((g) => <td key={`${q}${g.key}`}>{cells ? g.levels.reduce((a, l) => a + cells[l][q], 0) : 0}</td>))}{groups.map((g) => <td key={g.key}><strong>{g.levels.reduce((a, l) => a + levelNeed[l], 0)}</strong></td>)}<td><strong>100%</strong></td></tr>
              <tr><td colSpan={3}><strong>Tổng số điểm</strong></td>{QTYPES.map((q) => <td key={q} colSpan={3}>{fmtPoints(partPoints[q])}</td>)}{groups.map((g) => <td key={g.key}>{fmtPoints(QTYPES.reduce((a, q) => a + (partNeed[q] > 0 && cells ? g.levels.reduce((b, l) => b + cells[l][q], 0) * (partPoints[q] / partNeed[q]) : 0), 0))}</td>)}<td>{fmtPoints(totalPts)}</td></tr>
              <tr><td colSpan={3}><strong>Tỉ lệ %</strong></td>{QTYPES.map((q) => <td key={q} colSpan={3}>{pct(partPoints[q])}</td>)}{groups.map((g) => <td key={g.key}>{pct(QTYPES.reduce((a, q) => a + (partNeed[q] > 0 && cells ? g.levels.reduce((b, l) => b + cells[l][q], 0) * (partPoints[q] / partNeed[q]) : 0), 0))}</td>)}<td>100%</td></tr>
            </tbody></table></div>
            <h3>Bảng đặc tả</h3>
            <div style={{ overflowX: 'auto' }}><table><thead>
              <tr><th rowSpan={2}>STT</th><th rowSpan={2}>Chương/chủ đề</th><th rowSpan={2}>Nội dung</th><th rowSpan={2}>Mức độ kiểm tra, đánh giá</th><th colSpan={3}>Số câu hỏi theo mức độ nhận thức</th></tr>
              <tr><th>Nhận biết</th><th>Thông hiểu</th><th>Vận dụng</th></tr>
            </thead><tbody>
              {chapters.map((ch, ci) => ch.idx.map((i, ri) => (<tr key={i}>{ri === 0 && <td rowSpan={ch.idx.length}>{ci + 1}</td>}{ri === 0 && <td rowSpan={ch.idx.length}>{ch.name}</td>}<td>{lessonTitle(lessons[i].name) || lessons[i].name}</td><td>{groups.filter((g) => QTYPES.some((q) => (dist[i][`${q}|${g.key}`] ?? 0) > 0)).map((g) => yeuCau[g.key]).join(' ')}</td>{groups.map((g) => <td key={g.key}>{QTYPES.filter((q) => (dist[i][`${q}|${g.key}`] ?? 0) > 0).map((q) => `${dist[i][`${q}|${g.key}`]}${codeOf[q]}`).join(' ')}</td>)}</tr>)))}
            </tbody></table></div>
          </>); })()}
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

      {tab === 'practice' && (
        <main>
          <section className="card"><h2>Tự luyện trắc nghiệm</h2>
            <div className="filters">
              <button className={practiceMode === 'vi' ? 'primary' : ''} onClick={() => setPracticeMode('vi')}>Toán tiếng Việt</button>
              <button className={practiceMode === 'en' ? 'primary' : ''} onClick={() => setPracticeMode('en')}>Toán tiếng Anh</button>
              <label>Lớp<select value={practiceGrade} onChange={(e) => setPracticeGrade(e.target.value)}><option>10</option><option>11</option><option>12</option></select></label>
              <label>Bài<select value={practiceLesson} onChange={(e) => setPracticeLesson(e.target.value)}><option value="">Tất cả bài</option>{ENGLISH_LESSONS[Number(practiceGrade)].map((l) => <option key={l} value={l}>{l}</option>)}</select></label>
              <label>Mức độ<select value={practiceLevel} onChange={(e) => setPracticeLevel(e.target.value)}><option value="">Tất cả</option>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</select></label>
              <label>Số câu<select value={practiceCount} onChange={(e) => setPracticeCount(Number(e.target.value))}><option value={10}>10 câu</option><option value={20}>20 câu</option><option value={30}>30 câu</option></select></label>
              <button className="primary" onClick={() => void startPractice()}>Bắt đầu {practiceCount} câu</button>
            </div>
            {practiceMode === 'en' && !hasEnglish && <p className="notice">Toán tiếng Anh cần đang dùng thử hoặc được quản trị cấp quyền.</p>}
            {practiceQs.length > 0 && <p className="notice">Thời gian: {String(Math.floor(practiceSeconds / 60)).padStart(2, '0')}:{String(practiceSeconds % 60).padStart(2, '0')} • Đã làm {Object.keys(practiceAnswers).length}/{practiceQs.length} câu</p>}
            {practiceChecked && <p className="notice">Kết quả: {practiceQs.filter((q, i) => practiceAnswers[i] === q.correctIndex).length}/{practiceQs.length} câu đúng.</p>}
            {practiceHistory.length > 0 && <p>Lịch sử luyện tập gần nhất: {practiceHistory.slice(0, 3).map((h) => `${h.mode} lớp ${h.grade}: ${h.correct}/${h.total}`).join(' • ')}</p>}
          </section>
          {practiceQs.map((q, i) => ({ q, i })).filter(({ q, i }) => !practiceWrongOnly || practiceAnswers[i] !== q.correctIndex).map(({ q, i }) => (
            <section className="card" key={i}>
              <p><strong>Câu {i + 1}.</strong> <MathText text={q.content} /></p>
              {q.meta && <p className="muted">{q.meta}</p>}
              {practiceMode === 'en' && <button onClick={() => { const u = new SpeechSynthesisUtterance(q.content.replace(/\$/g, '')); u.lang = 'en-US'; u.rate = 0.9; speechSynthesis.speak(u); }}>🔊 Nghe câu hỏi</button>}
              {q.options.map((op, oi) => (
                <label className="check" key={oi} style={practiceChecked ? { fontWeight: oi === q.correctIndex ? 700 : 400 } : undefined}>
                  <input type="radio" name={`pq-${i}`} checked={practiceAnswers[i] === oi} disabled={practiceChecked} onChange={() => setPracticeAnswers({ ...practiceAnswers, [i]: oi })} /> {'ABCD'[oi]}. <MathText text={op} />{practiceChecked && oi === q.correctIndex ? ' ✓' : practiceChecked && practiceAnswers[i] === oi ? ' ✗' : ''}
                </label>
              ))}
              {practiceChecked && <p><strong>Lời giải:</strong> <MathText text={q.explanation} /></p>}
            </section>
          ))}
          {practiceQs.length > 0 && !practiceChecked && <button className="primary" onClick={submitPractice}>Nộp bài</button>}
          {practiceChecked && <div className="filters"><button onClick={() => void startPractice()}>Làm bộ mới</button><button onClick={() => setPracticeWrongOnly(!practiceWrongOnly)}>{practiceWrongOnly ? 'Xem tất cả' : 'Chỉ xem câu sai'}</button><button onClick={retryWrong}>Luyện lại câu sai</button></div>}
        </main>
      )}

      {tab === 'games' && (
        <main className="card no-print">
          <h2>Trò chơi Toán học</h2>
          <p className="muted">15 trò chơi biến tấu riêng của Toán THPT Thầy Đôi, lấy câu từ ngân hàng theo lớp và mức độ.</p>
          <div className="filters">
            <label>Ngôn ngữ<select value={gameLang} onChange={(e) => setGameLang(e.target.value as 'vi' | 'en')}><option value="vi">Tiếng Việt</option><option value="en">Tiếng Anh</option></select></label>
            <label>Lớp<select value={gameGrade} onChange={(e) => setGameGrade(Number(e.target.value))}><option>10</option><option>11</option><option>12</option></select></label>
            <label>Mức độ<select value={gameLevel} onChange={(e) => setGameLevel(e.target.value)}><option value="">Tất cả</option>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</select></label>
            <button onClick={() => setSoundOn(!soundOn)}>{soundOn ? '🔊 Âm thanh: Bật' : '🔇 Âm thanh: Tắt'}</button>
          </div>
          <div className="filters">{GAME_MODES.map((m) => <button key={m.id} className={gameModeId === m.id ? 'primary' : ''} onClick={() => void startGame(m.id)} title={m.desc}>{m.icon} {m.name}{gameBest[m.id] ? ` (kỷ lục ${gameBest[m.id]})` : ''}</button>)}</div>
          {gameQs.length > 0 && !gameDone && gameQs[gameIdx] && (<section className="card">
            <p><strong>{GAME_MODES.find((m) => m.id === gameModeId)?.icon} {GAME_MODES.find((m) => m.id === gameModeId)?.name}</strong> • Câu {gameIdx + 1}/{gameQs.length} • Điểm: {gameScore} • Chuỗi đúng: {gameStreak} 🔥 • Thời gian: {gameTimeLeft}s{gameLives < 90 ? ` • Mạng: ${gameLives} ❤️` : ''}</p>
            <p className="muted">{gameQs[gameIdx].meta}</p>
            <MathText text={gameQs[gameIdx].content} />
            <div className="filters">{gameQs[gameIdx].options.map((op, i) => <button key={i} disabled={gamePicked !== null} className={gamePicked !== null && i === gameQs[gameIdx].correctIndex ? 'primary' : ''} onClick={() => answerGame(i)}>{String.fromCharCode(65 + i)}. <MathText text={op} /></button>)}</div>
            {gamePicked !== null && <p>{gamePicked === gameQs[gameIdx].correctIndex ? '🎉 Đúng rồi!' : '😢 Chưa đúng.'} <MathText text={gameQs[gameIdx].explanation} /></p>}
          </section>)}
          {gameDone && <section className="card"><h3>🏆 Kết thúc trò chơi</h3><p>Điểm: <strong>{gameScore}</strong> • Đúng {gameCorrect}/{gameQs.length} câu • Kỷ lục: {gameBest[gameModeId] ?? gameScore}</p><button className="primary" onClick={() => void startGame(gameModeId)}>Chơi lại</button></section>}
        </main>
      )}

      {tab === 'news' && (
        <main>
          <section className="card"><h2>Tin giáo dục và công văn</h2>
            <p>Tin và văn bản từ nguồn chính thức của Bộ Giáo dục và Đào tạo. Bấm vào từng mục để mở trang gốc.</p>
            <div className="filters"><label>Tìm tin<input value={newsQuery} onChange={(e) => setNewsQuery(e.target.value)} placeholder="Ví dụ: công văn, thi tốt nghiệp, trung học" /></label></div>
          </section>
          <section className="card"><h3>Tóm tắt nguồn tin chính thống</h3>
            <p>Toàn bộ tin trong mục này lấy từ <strong>Cổng thông tin điện tử Bộ Giáo dục và Đào tạo (moet.gov.vn)</strong> — nguồn chính thống của Bộ. Ba nguồn chính:</p>
            <p>• <strong>Tin tức Bộ GD&ĐT:</strong> tin hoạt động của Bộ, thông cáo báo chí, tin tổng hợp giáo dục.</p>
            <p>• <strong>Giáo dục trung học:</strong> tin và văn bản bậc trung học, sách giáo khoa, dạy thêm học thêm.</p>
            <p>• <strong>Chính sách và thi tốt nghiệp THPT:</strong> dự thảo quy chế thi, chính sách đột phá phát triển giáo dục.</p>
            <p>Mỗi tin bên dưới đều có tóm tắt ngắn và nút mở trang gốc của Bộ để thầy xem văn bản đầy đủ.</p>
          </section>
          <section className="card"><h3>Nguồn chính thức</h3>
            {NEWS_SOURCES.map((n) => (<p key={n.url}><a href={n.url} target="_blank" rel="noreferrer"><strong>{n.title}</strong></a> — {n.desc}</p>))}
          </section>
          {NEWS_ITEMS.filter((n) => !newsQuery || `${n.title} ${n.tag} ${n.desc}`.toLowerCase().includes(newsQuery.toLowerCase())).map((n) => (
            <section className="card" key={n.title}>
              <p><strong>{n.title}</strong></p>
              <p className="muted">{n.date} • {n.tag} • Bộ Giáo dục và Đào tạo</p>
              <p>{n.desc}</p>
              <p><a href={n.url} target="_blank" rel="noreferrer">Mở nguồn chính thức</a></p>
            </section>
          ))}
        </main>
      )}

      {tab === 'users' && (
        <main>
          {!isAdmin ? <section className="card"><h2>Quản lý người dùng</h2><p>Chỉ quản trị mới vào được mục này.</p></section> : (<>
          <section className="card"><h2>Quản lý người dùng</h2>
            <p>Tổng {profiles.length} tài khoản · Đang dùng thử {profiles.filter((pr) => new Date(pr.trial_ends_at).getTime() > Date.now() && !pr.full_access).length} · Full {profiles.filter((pr) => pr.full_access || pr.role === 'admin').length} · Yêu cầu tiếng Anh {profiles.filter((pr) => pr.english_requested).length}</p>
            <div className="filters">
              <label>Tìm email<input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Nhập email…" /></label>
              <label>Lọc<select value={userFilter} onChange={(e) => setUserFilter(e.target.value as typeof userFilter)}><option value="all">Tất cả</option><option value="student">Học sinh</option><option value="teacher">Giáo viên</option><option value="trial">Đang dùng thử</option><option value="full">Full</option><option value="english">Có tiếng Anh</option><option value="requested">Đang yêu cầu tiếng Anh</option><option value="limited">Giới hạn</option></select></label>
              <button onClick={() => void loadProfiles()}>Tải lại</button>
            </div>
          </section>
          {profiles.filter((pr) => {
            const trial = new Date(pr.trial_ends_at).getTime() > Date.now();
            const full = pr.full_access || pr.role === 'admin';
            const eng = pr.english_access || full || trial;
            if (userSearch.trim() && !pr.email.toLowerCase().includes(userSearch.trim().toLowerCase())) return false;
            if (userFilter === 'student') return pr.role === 'student';
            if (userFilter === 'teacher') return pr.role === 'teacher';
            if (userFilter === 'trial') return trial && !full;
            if (userFilter === 'full') return full;
            if (userFilter === 'english') return eng;
            if (userFilter === 'requested') return pr.english_requested;
            if (userFilter === 'limited') return !full && !trial;
            return true;
          }).map((pr) => {
            const trial = new Date(pr.trial_ends_at).getTime() > Date.now();
            return (
            <section className="card" key={pr.user_id}>
              <p><strong>{pr.email}</strong> · {pr.role === 'admin' ? 'Quản trị' : pr.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}</p>
              <p className="muted">Đăng ký {new Date(pr.created_at).toLocaleDateString('vi-VN')} · {pr.full_access || pr.role === 'admin' ? 'Full tính năng' : trial ? `Dùng thử đến ${new Date(pr.trial_ends_at).toLocaleDateString('vi-VN')}` : 'Giới hạn'} · Tiếng Anh: {pr.english_access || pr.full_access || pr.role === 'admin' ? 'Có' : pr.english_requested ? 'Đang yêu cầu' : 'Chưa'}</p>
              {pr.role !== 'admin' && <div className="filters">
                <button onClick={() => void updateProfile(pr.user_id, { full_access: !pr.full_access })}>{pr.full_access ? 'Thu hồi full' : 'Cấp full'}</button>
                <button onClick={() => void updateProfile(pr.user_id, { english_access: !pr.english_access, english_requested: false })}>{pr.english_access ? 'Thu hồi tiếng Anh' : 'Cấp tiếng Anh'}</button>
                <button onClick={() => void updateProfile(pr.user_id, { role: pr.role === 'teacher' ? 'student' : 'teacher' })}>Đổi vai trò</button>
                <button onClick={() => void updateProfile(pr.user_id, { trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString() })}>Gia hạn 7 ngày</button>
                <button onClick={() => void updateProfile(pr.user_id, { trial_ends_at: new Date(Date.now() + 30 * 86400000).toISOString() })}>Gia hạn 30 ngày</button>
                <button onClick={() => void updateProfile(pr.user_id, { full_access: false, english_access: false, trial_ends_at: new Date(Date.now() - 1000).toISOString() })}>Khóa tài khoản</button>
              </div>}
            </section>);
          })}
          </>)}
        </main>
      )}

      {tab === 'admin' && (
        <main className="card no-print">
          {isAdmin && <p className="notice">Quản lý tài khoản ở mục <button onClick={() => setTab('users')}>Quản lý người dùng</button>.</p>}
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
          {aiImage && <div className="ai-preview"><img src={aiImage.preview} alt="Ảnh bài tập" style={{ maxWidth: 120, borderRadius: 8 }} /><button onClick={() => setAiImage(null)}>Bỏ ảnh</button></div>}<div className="ai-input"><label className="ai-attach">📷 Ảnh<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pickAiImage(f); e.target.value = ''; }} /></label><textarea rows={2} value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder="Hỏi AI về bài toán, đề thi, cách giải…" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendAi(); } }} /><button className="primary" onClick={() => void sendAi()} disabled={aiBusy}>Gửi</button></div>
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
