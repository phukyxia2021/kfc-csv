# KFC Fried Chicken – Landing Page (Vibe Coding Project)

## Mục tiêu
Xây dựng landing page quảng cáo theo phong cách gà rán KFC bằng **HTML, CSS và JavaScript thuần**, phù hợp để thực hành Vibe Coding với Antigravity.

> **Lưu ý thương hiệu:** Đây là dự án học tập/phi thương mại do người học tự xây dựng, không phải website chính thức của KFC và không được KFC bảo trợ. KFC, tên gọi và các dấu hiệu nhận diện liên quan là tài sản của chủ sở hữu tương ứng. Không tự ý sử dụng logo/hình ảnh có bản quyền nếu chưa có quyền sử dụng.

## Công nghệ và giới hạn bắt buộc
- HTML5, CSS3, JavaScript thuần (Vanilla JS).
- Bootstrap không bắt buộc; ưu tiên CSS tự viết để giữ trang nhẹ.
- Dữ liệu nội dung lưu trong các file CSV tại thư mục `data/`.
- Không backend, không server-side code, không database server, không framework JavaScript.
- Không dùng API ngoài hoặc dịch vụ cần tài khoản.
- Hình ảnh ít, kích thước nhỏ; ưu tiên SVG đơn giản tự tạo, CSS illustration hoặc ảnh WebP/JPG đã được tối ưu.

## Cấu trúc dự án đề xuất

```text
kfc-landing-page/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── data/
│   ├── products.csv
│   ├── promotions.csv
│   └── faqs.csv
├── assets/
│   └── images/
│       ├── hero-chicken.svg
│       └── bucket-chicken.svg
└── README.md
```

Các file CSV mẫu được mô tả trong `DATA_SPEC.md`. Các file Markdown còn lại là tài liệu hướng dẫn cho AI Agent; không nhất thiết phải được đưa vào website khi triển khai.

## Chạy thử trên máy
Trình duyệt thường chặn `fetch()` đọc CSV khi mở trực tiếp bằng đường dẫn `file://`. Hãy mở thư mục dự án bằng VS Code/Antigravity và chạy bằng tiện ích **Live Server** hoặc một máy chủ tĩnh tương đương. Đây chỉ là máy chủ phục vụ file tĩnh, không phải backend ứng dụng.

## Quy tắc khi triển khai
1. Đọc `PROJECT_BRIEF.md`, `DESIGN_GUIDE.md`, `DATA_SPEC.md` và `IMPLEMENTATION_PLAN.md`.
2. Tạo trang responsive, ưu tiên mobile-first.
3. Đọc dữ liệu CSV bằng `fetch()` và xử lý dữ liệu trong trình duyệt.
4. Nếu CSV tải lỗi, hiển thị nội dung dự phòng thân thiện; không làm trang trắng.
5. Không lưu thông tin thanh toán, mật khẩu hoặc dữ liệu cá nhân nhạy cảm.
6. Mọi giá, ưu đãi và thông tin trong dữ liệu mẫu chỉ là nội dung minh họa, cần thay bằng thông tin đã được xác minh trước khi sử dụng thực tế.
