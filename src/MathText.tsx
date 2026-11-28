import katex from 'katex';
import 'katex/dist/katex.min.css';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const KNOWN_COMMANDS = [
  'displaystyle', 'overrightarrow', 'overleftarrow', 'underbrace', 'overbrace',
  'Leftrightarrow', 'Rightarrow', 'Longleftrightarrow', 'Longrightarrow', 'longleftrightarrow',
  'longrightarrow', 'longmapsto', 'rightarrow', 'leftarrow', 'uparrow', 'downarrow',
  'leftrightarrow', 'mapsto', 'widehat', 'widetilde', 'overline', 'underline',
  'dfrac', 'tfrac', 'frac', 'sqrt', 'binom', 'begin', 'end', 'left', 'right',
  'middle', 'bigg', 'Bigg', 'big', 'Big', 'quad', 'qquad', 'hspace', 'vspace',
  'text', 'textbf', 'textit', 'mathrm', 'mathbf', 'mathit', 'mathbb', 'mathcal',
  'mathfrak', 'boldsymbol', 'operatorname', 'limits', 'nolimits', 'sum', 'prod',
  'int', 'iint', 'oint', 'lim', 'limsup', 'liminf', 'sup', 'inf', 'max', 'min',
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh',
  'cosh', 'tanh', 'log', 'ln', 'lg', 'exp', 'det', 'dim', 'ker', 'gcd', 'lcm',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta',
  'theta', 'vartheta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi',
  'varpi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'varphi', 'chi', 'psi',
  'omega', 'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi',
  'Psi', 'Omega', 'infty', 'partial', 'nabla', 'forall', 'exists', 'nexists',
  'neg', 'emptyset', 'varnothing', 'in', 'notin', 'ni', 'subset', 'supset',
  'subseteq', 'supseteq', 'subsetneq', 'cup', 'cap', 'setminus', 'mid', 'nmid',
  'parallel', 'perp', 'angle', 'triangle', 'square', 'circ', 'bullet', 'cdot',
  'times', 'div', 'pm', 'mp', 'ast', 'star', 'diamond', 'oplus', 'otimes',
  'leq', 'geq', 'neq', 'le', 'ge', 'ne', 'll', 'gg', 'approx', 'sim', 'simeq',
  'cong', 'equiv', 'propto', 'asymp', 'prec', 'succ', 'preceq', 'succeq', 'to',
  'gets', 'mapsto', 'implies', 'iff', 'land', 'lor', 'lnot', 'wedge', 'vee',
  'vec', 'hat', 'bar', 'dot', 'ddot', 'tilde', 'check', 'breve', 'acute',
  'grave', 'mathring', 'prime', 'ell', 'hbar', 'imath', 'jmath', 'wp', 'Re',
  'Im', 'aleph', 'boxed', 'color', 'textcolor', 'displaystyle', 'textstyle',
  'not', 'mod', 'pmod', 'bmod', 'binom', 'choose', 'over', 'atop', 'above',
  'sqrt', 'root', 'of', 'cases', 'array', 'matrix', 'pmatrix', 'bmatrix',
  'vmatrix', 'aligned', 'align', 'gathered', 'split', 'hline', 'cline',
  'ldots', 'cdots', 'vdots', 'ddots', 'dots', 'colon', 'coloneqq', 'eqqcolon',
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
];
const COMMAND_SET = new Set(KNOWN_COMMANDS);
const COMMANDS_BY_LEN = [...new Set(KNOWN_COMMANDS)].sort((a, b) => b.length - a.length);

function fixStuckCommands(tex: string): string {
  return tex.replace(/\\([A-Za-z]+)/g, (whole, name: string) => {
    if (COMMAND_SET.has(name)) return whole;
    for (const cmd of COMMANDS_BY_LEN) {
      if (name.startsWith(cmd) && name.length > cmd.length) {
        const rest = name.slice(cmd.length);
        const restIsCommand = COMMANDS_BY_LEN.some((c) => rest.startsWith(c));
        return restIsCommand ? `\\${cmd}\\${rest}` : `\\${cmd} ${rest}`;
      }
    }
    return whole;
  });
}

function renderMath(tex: string, displayMode: boolean): string {
  const clean0 = tex.replace(/\\hfill/g, '\\quad').replace(/\\displaystyle/g, '');
  const attempts = [clean0, fixStuckCommands(clean0)];
  const open = (clean0.match(/\{/g) ?? []).length;
  const close = (clean0.match(/\}/g) ?? []).length;
  if (open > close) attempts.push(fixStuckCommands(clean0) + '}'.repeat(open - close));
  for (const clean of attempts) {
    try {
      const html = katex.renderToString(clean, { displayMode, throwOnError: true, strict: 'ignore' });
      if (!html.includes('katex-error')) return html;
    } catch {
      // try next attempt
    }
  }
  try {
    return katex.renderToString(attempts[attempts.length - 1], { displayMode, throwOnError: false, strict: 'ignore' });
  } catch {
    return escapeHtml(tex);
  }
}

function normalizeTexText(input: string): string {
  let text = input
    .replace(/\u0007/g, '\\a')
    .replace(/\u0008/g, '\\b')
    .replace(/\u000b/g, '\\v')
    .replace(/\u000c/g, '\\f')
    .replace(/\uf8f1/g, '\\{')
    .replace(/\uf8f3/g, '\\}')
    .replace(/\uf8f4/g, '|')
    .replace(/\uf8ee/g, '[')
    .replace(/\uf8f0/g, ']')
    .replace(/\u0338⊂/g, '\\not\\subset')
    .replace(/⊂\u0338/g, '\\not\\subset')
    .replace(/\u0338∈/g, '\\not\\in')
    .replace(/∈\u0338/g, '\\not\\in')
    .replace(/\u0338=/g, '\\ne')
    .replace(/=\u0338/g, '\\ne')
    .replace(/\u0338/g, '')
    .replace(/\\'/g, "'")
    .replace(/\\\\([A-Za-z]+)/g, (whole, name: string) =>
      COMMANDS_BY_LEN.some((c) => name.startsWith(c)) ? `\\${name}` : whole,
    )
    .replace(/\\\\(?=[,;:!{}])/g, '\\')
    .replace(/=\$([^$]*)\$\$/g, '=$1$')
    .replace(/\^\{(\d)(\d+)\}\^/g, '^{$1}$2^')
    .replace(/\^(-?\d{2,})/g, '^{$1}')
    .replace(/_(-?\d{2,})/g, '_{$1}')
    .replace(/\\sqrt(\d{2,})/g, '\\sqrt{$1}')
    .replace(/(\\d?frac\{[^{}]*\})(\d{2,})/g, '$1{$2}')
    .replace(/(\d)\$%/g, '$1%');
  if (text.includes('\\begin{cases}') || text.includes('\\begin{array}')) {
    text = text.replace(/\\begin\{(cases|array)\}[\s\S]*?\\end\{\1\}/g, (seg) => {
      const vars = ['y', 'z', 'w', 'u', 'v'];
      let vi = 0;
      return seg
        .replace(/(?<!\\)\\([2-9])(?=[A-Za-z])/g, '\\\\$1')
        .replace(/(?<!\\)\\([2-9])/g, '$1')
        .replace(/\\1(?=[A-Za-z])/g, '\\\\')
        .replace(/\\1(?=\^)/g, '\\\\x')
        .replace(/\\1(?=[+\-≤≥<>])/g, '\\\\x')
        .replace(/\\1(?=\\(le|ge)\b)/g, '\\\\x')
        .replace(/\\1(?==)/g, () => `\\\\${vars[vi++] ?? 'y'}`)
        .replace(/\\1(?=[0-9])/g, '\\\\')
        .replace(/\\1/g, '\\\\');
    });
  }
  if (((text.match(/\$/g) ?? []).length % 2) === 1) {
    text = text.replace(/(\d)\$([.,;:”])/g, '$1$2');
  }
  return text;
}

export function mathHtml(input: string): string {
  const text = normalizeTexText(input ?? '');
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
