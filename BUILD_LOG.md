# BUILD_LOG — Toán THPT Thầy Đôi (bản Vercel/Supabase độc lập)

Ngày kiểm chứng: 2026-11-26.

## Kết quả build

- Lệnh: `npm install` rồi `npm run build`.
- Kết quả: PASS. Vite build xong, `dist/index.html` và assets được tạo.
- Cảnh báo không chặn build: chunk JS chính khoảng 502 kB sau minify (gzip khoảng 153 kB) do React + KaTeX; có thể tách chunk ở bản sau.

## Kiểm chứng dữ liệu/bảo mật

- Không có `questions.jsonl` hoặc `theory.json` trong thư mục app.
- App chỉ đọc Supabase qua `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.
- Khi chưa có biến môi trường, giao diện hiện “Chưa cấu hình Supabase” và không bịa dữ liệu.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ xuất hiện dưới dạng tên biến môi trường trong script import/README, không có khóa thật.

## Tính năng đã có

- Vite + React + TypeScript, giao diện tiếng Việt, KaTeX cho `$...$`, `$$...$$`, `\(...\)`, `\[...\]`.
- Tổng quan: tổng câu, số bài lý thuyết, đếm theo lớp/mức/phần từ Supabase.
- Ngân hàng câu hỏi: lọc lớp/chương/dạng/mức/loại, tìm kiếm, phân trang, bật/tắt đáp án và lời giải, hiển thị hình nếu `image_url` có dữ liệu.
- Lý thuyết theo lớp từ `theory_notes`.
- Tạo đề theo ma trận: phạm vi chương/bài, số câu theo mức NB/TH/VD/VDC và theo Phần I–IV, sinh mã không trùng câu trong cùng lần tạo bằng rút không hoàn lại; thiếu câu hoặc ma trận không khả thi thì báo rõ.
- In đề theo mã bằng trang in trình duyệt, có tùy chọn in kèm đáp án/lời giải.
- `supabase/schema.sql` gồm `questions`, `theory_notes` và các bảng tối thiểu `exams`, `classes`, `students`, `assignments`, `submissions`.

## Phần còn thiếu trước khi push/deploy dùng thật

- Chưa push GitHub, chưa ghi Supabase, chưa deploy Vercel trong nhiệm vụ này.
- Cần project Supabase riêng cho Toán THPT, chạy schema và import dữ liệu từ gói xuất ngoài repo.
- Cần cài biến môi trường trên Vercel bằng tài khoản mới rồi redeploy.
- Chưa có đăng nhập/phân quyền giáo viên-học sinh, UI lớp/học sinh/giao bài/nộp bài/chấm tự động/chấm tự luận tay, lưu đề đã sinh vào Supabase, xuất Word/PDF ngoài trang in, và quản trị câu hỏi trực tiếp trong app.
