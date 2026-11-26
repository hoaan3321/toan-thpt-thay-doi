export type Level = 'NB' | 'TH' | 'VD' | 'VDC';
export type QType = 'single' | 'tf' | 'short' | 'essay';

export interface Question {
  id: number;
  grade: number;
  chapter: string;
  lesson?: string;
  dang: string;
  level: Level;
  qtype: QType;
  content: string;
  options: string[];
  correct: string;
  explanation: string;
  points: number;
  image_key?: string;
  image_url?: string;
  geogebra?: string;
}

export interface TheoryNote {
  id: number;
  grade: number;
  chapter: string;
  title: string;
  content: string;
  order_index: number;
  source_name?: string;
  source_url?: string;
  created_at?: string;
}

export interface ExamCodeRecord {
  code: number;
  questionIds: number[];
  rawPoints: number;
}

export interface ExamRecord {
  id: number;
  title: string;
  grade: number;
  scope_chapter: string;
  scope_lesson: string;
  matrix: unknown;
  codes: ExamCodeRecord[];
  duration_minutes?: number;
  created_at?: string;
}

export interface ClassRecord {
  id: number;
  name: string;
  grade: number;
  created_at?: string;
}

export interface StudentRecord {
  id: number;
  class_id: number;
  full_name: string;
  created_at?: string;
}

export interface Assignment {
  id: number;
  exam_id: number;
  class_id: number | null;
  join_code: string;
  is_open: boolean;
  title?: string;
  duration_minutes?: number;
  show_result?: boolean;
  created_at?: string;
}

export interface Submission {
  id: number;
  assignment_id: number;
  student_id?: number | null;
  student_name: string;
  class_name?: string;
  code_index: number;
  answers: Record<string, unknown>;
  score: number | null;
  auto_score?: number | null;
  essay_score?: number | null;
  detail: Record<string, unknown>;
  status?: string;
  submitted_at?: string;
  graded_at?: string | null;
}

export const LEVELS: Level[] = ['NB', 'TH', 'VD', 'VDC'];
export const QTYPES: QType[] = ['single', 'tf', 'short', 'essay'];
export const QTYPE_LABEL: Record<QType, string> = {
  single: 'Phần I. Trắc nghiệm',
  tf: 'Phần II. Đúng/Sai',
  short: 'Phần III. Trả lời ngắn',
  essay: 'Phần IV. Tự luận',
};
