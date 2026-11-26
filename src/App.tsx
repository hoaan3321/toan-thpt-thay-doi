import { useEffect, useMemo, useState } from 'react';
import MathText from './MathText';
import { eqParams, ilike, isSupabaseConfigured, supabaseCount, supabaseGet } from './supabase';
import { LEVELS, QTYPES, QTYPE_LABEL, type Level, type QType, type Question, type TheoryNote } from './types';

type Tab = 'overview' | 'bank' | 'theory' | 'matrix' | 'print';

interface GeneratedCode {
  code: number;
  questions: Question[];
  rawPoints: number;
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

  const [mGrade, setMGrade] = useState(12);
  const [mChapter, setMChapter] = useState('');
  const [mLesson, setMLesson] = useState('');
  const [numCodes, setNumCodes] = useState(4);
  const [levelNeed, setLevelNeed] = useState<Record<Level, number>>({ NB: 5, TH: 5, VD: 4, VDC: 2 });
  const [partNeed, setPartNeed] = useState<Record<QType, number>>({ single: 8, tf: 3, short: 3, essay: 2 });
  const [generated, setGenerated] = useState<GeneratedCode[]>([]);
  const [matrixMsg, setMatrixMsg] = useState('');

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

  async function loadOverview() {
    if (!isSupabaseConfigured) return;
    setLoading(true); setError('');
    try {
      const [total, theoryTotal] = await Promise.all([
        supabaseCount('questions', new URLSearchParams()),
        supabaseCount('theory_notes', new URLSearchParams()),
      ]);
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

  async function loadScopedPool(): Promise<Question[]> {
    const p = eqParams({ grade: mGrade });
    if (mChapter.trim()) p.set('chapter', ilike(mChapter.trim()));
    if (mLesson.trim()) p.set('chapter', ilike(mLesson.trim()));
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
            for (let i = 0; i < cells[l][q]; i++) qs.push(buckets[l][q].pop()!);
          }
        }
        codes.push({ code: c, questions: qs, rawPoints: qs.reduce((s, x) => s + Number(x.points || 0), 0) });
      }
      setGenerated(codes);
      setMatrixMsg(`Đã sinh ${codes.length} mã, mỗi mã ${totalLevel} câu, không trùng câu giữa các mã.`);
      setTab('print');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadOverview(); }, []);
  useEffect(() => { if (tab === 'bank') void loadBank(0); }, [tab]);
  useEffect(() => { if (tab === 'theory') void loadTheory(); }, [tab, theoryGrade]);

  return (
    <div className="app">
      <header className="topbar no-print">
        <div>
          <h1>Toán THPT Thầy Đôi</h1>
          <p>Ngân hàng câu hỏi, lý thuyết và ma trận đề Toán THPT</p>
        </div>
        <nav>
          {([['overview', 'Tổng quan'], ['bank', 'Ngân hàng câu hỏi'], ['theory', 'Lý thuyết'], ['matrix', 'Tạo đề'], ['print', 'In đề']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{label}</button>
          ))}
        </nav>
      </header>

      {!isSupabaseConfigured && (
        <section className="notice no-print">
          <strong>Chưa cấu hình Supabase.</strong> Hãy đặt <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code> trong biến môi trường Vercel, chạy <code>supabase/schema.sql</code> và import dữ liệu trước khi dùng.
        </section>
      )}
      {error && <section className="notice danger no-print">{error}</section>}
      {loading && <p className="muted no-print">Đang tải…</p>}

      {tab === 'overview' && (
        <main className="grid">
          <section className="card"><h2>Tổng số câu</h2><p className="big">{overview?.total ?? '—'}</p><p>Lý thuyết: {overview?.theory ?? '—'} bài</p></section>
          <section className="card"><h2>Theo lớp</h2>{[10, 11, 12].map((g) => <p key={g}>Lớp {g}: <strong>{overview?.byGrade[g] ?? '—'}</strong></p>)}</section>
          <section className="card"><h2>Theo mức</h2>{LEVELS.map((l) => <p key={l}>{l}: <strong>{overview?.byLevel[l] ?? '—'}</strong></p>)}</section>
          <section className="card"><h2>Theo phần</h2>{QTYPES.map((q) => <p key={q}>{QTYPE_LABEL[q]}: <strong>{overview?.byType[q] ?? '—'}</strong></p>)}</section>
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

      {tab === 'matrix' && (
        <main className="card no-print">
          <h2>Tạo đề theo ma trận</h2>
          <div className="filters">
            <label>Lớp<select value={mGrade} onChange={(e) => setMGrade(Number(e.target.value))}><option>10</option><option>11</option><option>12</option></select></label>
            <label>Phạm vi chương<input value={mChapter} onChange={(e) => setMChapter(e.target.value)} placeholder="Để trống = toàn khối" /></label>
            <label>Phạm vi bài<input value={mLesson} onChange={(e) => setMLesson(e.target.value)} placeholder="Tên bài/§ trong chương" /></label>
            <label>Số mã đề<input type="number" min={1} max={50} value={numCodes} onChange={(e) => setNumCodes(Math.max(1, Math.min(50, Number(e.target.value))))} /></label>
          </div>
          <h3>Số câu theo mức</h3>
          <div className="filters">{LEVELS.map((l) => <label key={l}>{l}<input type="number" min={0} value={levelNeed[l]} onChange={(e) => setLevelNeed({ ...levelNeed, [l]: Math.max(0, Number(e.target.value)) })} /></label>)}</div>
          <h3>Số câu theo phần</h3>
          <div className="filters">{QTYPES.map((q) => <label key={q}>{QTYPE_LABEL[q]}<input type="number" min={0} value={partNeed[q]} onChange={(e) => setPartNeed({ ...partNeed, [q]: Math.max(0, Number(e.target.value)) })} /></label>)}</div>
          <p className="muted">Tổng theo mức phải bằng tổng theo phần. Hệ thống rút không hoàn lại giữa các mã; thiếu câu sẽ báo rõ.</p>
          <button className="primary" onClick={() => void generateExam()}>Sinh mã đề</button>
          {matrixMsg && <p className="notice">{matrixMsg}</p>}
        </main>
      )}

      {tab === 'print' && (
        <main>
          <div className="no-print filters">
            <button className="primary" onClick={() => window.print()}>In đề</button>
            <label className="check"><input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} /> In kèm đáp án/lời giải</label>
          </div>
          {generated.length === 0 && <p className="muted">Chưa có mã đề. Hãy vào mục Tạo đề để sinh mã.</p>}
          {generated.map((code) => (
            <section className="exam" key={code.code}>
              <h2>Đề Toán lớp {mGrade} — Mã đề {String(code.code).padStart(2, '0')}</h2>
              <p className="meta">Tổng điểm gốc: {code.rawPoints.toFixed(2)}; điểm quy đổi hiển thị theo thang 10.</p>
              {QTYPES.map((qt) => {
                const qs = code.questions.filter((q) => q.qtype === qt);
                if (!qs.length) return null;
                return (
                  <div key={qt}>
                    <h3>{QTYPE_LABEL[qt]}</h3>
                    {qs.map((q, i) => (
                      <article className="question" key={q.id}>
                        <p><strong>Câu {i + 1}.</strong> <MathText text={q.content} /></p>
                        {q.options?.length > 0 && <ol className="options">{q.options.map((op, oi) => <li key={oi}><MathText text={op} /></li>)}</ol>}
                        {showAnswers && <div className="answer"><p><strong>Đáp án:</strong> <MathText text={q.correct} /></p><MathText text={q.explanation} /></div>}
                      </article>
                    ))}
                  </div>
                );
              })}
            </section>
          ))}
        </main>
      )}
    </div>
  );
}

function QuestionCard({ q, showAnswers }: { q: Question; showAnswers: boolean }) {
  return (
    <article className="card">
      <p className="meta">ID {q.id} · Lớp {q.grade} · {q.chapter} · {q.dang} · {q.level} · {QTYPE_LABEL[q.qtype]} · {q.points} điểm</p>
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
