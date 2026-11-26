export type Level = 'NB' | 'TH' | 'VD' | 'VDC';
export type QType = 'single' | 'tf' | 'short' | 'essay';

export interface Question {
  id: number;
  grade: number;
  chapter: string;
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

export const LEVELS: Level[] = ['NB', 'TH', 'VD', 'VDC'];
export const QTYPES: QType[] = ['single', 'tf', 'short', 'essay'];
export const QTYPE_LABEL: Record<QType, string> = {
  single: 'Phần I. Trắc nghiệm',
  tf: 'Phần II. Đúng/Sai',
  short: 'Phần III. Trả lời ngắn',
  essay: 'Phần IV. Tự luận',
};
