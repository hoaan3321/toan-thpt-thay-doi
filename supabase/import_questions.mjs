#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const batchSize = Number(process.env.BATCH_SIZE || 500);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong biến môi trường.');
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const exportRoot = path.resolve(scriptDir, '..');
const questionsPath = process.env.QUESTIONS_PATH || path.join(exportRoot, 'questions.jsonl');
const theoryPath = process.env.THEORY_PATH || path.join(exportRoot, 'theory.json');
const baseUrl = supabaseUrl.replace(/\/$/, '');

function mapQuestion(q) {
  return {
    id: Number(q.id),
    grade: Number(q.grade),
    chapter: q.chapter ?? '',
    dang: q.dang ?? '',
    level: q.level ?? '',
    qtype: q.qtype ?? '',
    content: q.content ?? '',
    options: Array.isArray(q.options) ? q.options : [],
    correct: q.correct ?? '',
    explanation: q.explanation ?? '',
    points: Number(q.points ?? 0),
    image_key: q.imageKey ?? '',
    image_url: q.imageUrl ?? '',
    geogebra: q.geogebra ?? '',
  };
}

function mapTheoryNote(n) {
  return {
    id: Number(n.id),
    grade: Number(n.grade),
    chapter: n.chapter ?? '',
    title: n.title ?? '',
    content: n.content ?? '',
    order_index: Number(n.orderIndex ?? 0),
    source_name: n.sourceName ?? '',
    source_url: n.sourceUrl ?? '',
    created_at: n.createdAt || null,
  };
}

async function upsertBatch(table, rows) {
  const response = await fetch(`${baseUrl}/rest/v1/${table}?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upsert ${table} lỗi HTTP ${response.status}: ${text.slice(0, 1000)}`);
  }
}

async function upsertInBatches(table, rows) {
  let done = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await upsertBatch(table, batch);
    done += batch.length;
    console.log(`${table}: đã upsert ${done}/${rows.length}`);
  }
  return done;
}

async function importQuestions() {
  const text = await readFile(questionsPath, 'utf8');
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => mapQuestion(JSON.parse(line)));
  return upsertInBatches('questions', rows);
}

async function importTheoryNotes() {
  if (process.env.IMPORT_THEORY === '0') return 0;
  let text;
  try {
    text = await readFile(theoryPath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return 0;
    throw error;
  }
  const data = JSON.parse(text);
  const notes = Array.isArray(data) ? data : data.notes;
  if (!Array.isArray(notes)) throw new Error('theory.json không có mảng notes hợp lệ.');
  return upsertInBatches('theory_notes', notes.map(mapTheoryNote));
}

const questionCount = await importQuestions();
const theoryCount = await importTheoryNotes();
console.log(`Hoàn tất: questions=${questionCount}, theory_notes=${theoryCount}`);
