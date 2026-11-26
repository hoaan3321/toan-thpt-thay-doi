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

## Tính năng hiện có

- Tổng quan số câu theo lớp/mức/phần và số bài lý thuyết.
- Ngân hàng câu hỏi: lọc lớp/chương/dạng/mức/loại, tìm kiếm, phân trang, bật/tắt đáp án và lời giải.
- Lý thuyết theo lớp.
- Tạo đề theo ma trận phạm vi chương/bài, số câu theo mức NB/TH/VD/VDC và theo Phần I–IV; sinh mã đề không trùng câu trong cùng lần tạo; thiếu câu thì báo rõ.
- In đề theo mã và xuất Word, có tùy chọn kèm đáp án/lời giải.
- Đăng nhập giáo viên bằng Supabase Auth; tạo lớp/học sinh; lưu đề và giao bài bằng mã vào làm.
- Học sinh vào bằng mã giao bài, làm Phần I–IV, nộp bài; hệ thống chấm tự động Phần I–III và để Phần IV chờ giáo viên chấm.
- Xem kết quả/thống kê, chấm tự luận, xuất CSV.
- Quản trị câu hỏi trực tiếp trong app cho giáo viên đã đăng nhập: tải theo ID, thêm/sửa/xóa câu hỏi.

## Lưu ý vận hành

- Học sinh không cần tài khoản; giáo viên cần tạo tài khoản Supabase Auth trong app hoặc trong Supabase Dashboard.
- Dữ liệu câu hỏi vẫn nằm ở Supabase, repo không chứa file dữ liệu câu hỏi.
