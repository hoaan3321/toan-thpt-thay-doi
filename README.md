# Toán THPT Thầy Đôi

Bản app độc lập Vite + React + TypeScript để deploy lên Vercel bằng tài khoản GitHub/Vercel mới. App đọc dữ liệu từ Supabase qua biến môi trường; repo này không chứa file dữ liệu câu hỏi.

## Chạy tại chỗ

```bash
npm install
npm run dev
```

Tạo file `.env` từ `.env.example`:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Supabase

1. Tạo project Supabase riêng cho Toán THPT Thầy Đôi.
2. Chạy `supabase/schema.sql` trong Supabase SQL Editor.
3. Import dữ liệu từ gói xuất ngoài repo bằng script `supabase/import_questions.mjs` với biến môi trường máy chủ `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`. Không đưa service role key vào frontend hoặc repo.
4. Trên Vercel, cài `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`, rồi redeploy.

## Tính năng bản đầu

- Tổng quan số câu theo lớp/mức/phần và số bài lý thuyết.
- Ngân hàng câu hỏi: lọc lớp/chương/dạng/mức/loại, tìm kiếm, phân trang, bật/tắt đáp án và lời giải.
- Lý thuyết theo lớp.
- Tạo đề theo ma trận phạm vi chương/bài, số câu theo mức NB/TH/VD/VDC và theo Phần I–IV; sinh mã đề không trùng câu trong cùng lần tạo; thiếu câu thì báo rõ.
- In đề theo mã, có tùy chọn in kèm đáp án/lời giải.

## Còn thiếu trước khi dùng như hệ thống giao bài đầy đủ

- Đăng nhập giáo viên/học sinh và phân quyền theo vai trò.
- UI quản lý lớp/học sinh/giao bài/nộp bài/chấm tự động/chấm tự luận tay. Schema đã có các bảng tối thiểu `exams`, `classes`, `students`, `assignments`, `submissions`, nhưng bản đầu chưa giả lập luồng học sinh.
- Lưu đề đã sinh vào Supabase và xuất Word/PDF ngoài trang in trình duyệt.
- Quản trị câu hỏi trực tiếp trong app (thêm/sửa/xóa/gắn hình) ngoài script import.
