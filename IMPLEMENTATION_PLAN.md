# Implementation Plan – Hướng dẫn Antigravity

## Giai đoạn 1: Khởi tạo
- Tạo đúng cấu trúc thư mục trong `README.md`.
- Tạo `index.html`, `css/style.css`, `js/app.js`.
- Tạo 3 file CSV mẫu trong `data/`.
- Tạo 1–2 SVG đơn giản trong `assets/images/` hoặc dùng CSS illustration.

## Giai đoạn 2: Dựng HTML
- Dùng HTML5 semantic.
- Tạo các section có ID: `home`, `products`, `promotions`, `features`, `faq`, `contact`.
- Đặt các vùng dữ liệu động có container rõ ràng.
- Có trạng thái loading ban đầu.

## Giai đoạn 3: CSS
- Định nghĩa CSS variables cho màu, font, spacing, radius.
- Dựng header, hero, product cards, promotion cards, FAQ và footer.
- Mobile-first, sau đó thêm breakpoint cho tablet/desktop.
- Thêm hover/focus/active states.

## Giai đoạn 4: JavaScript
- Tạo hàm `fetchCSV(path)`.
- Tạo hàm `parseCSV(text)` có hỗ trợ quoted fields.
- Tạo hàm render riêng: `renderProducts`, `renderPromotions`, `renderFAQs`.
- Thêm lọc sản phẩm (nếu được yêu cầu).
- Thêm accordion FAQ.
- Xử lý lỗi fetch và dữ liệu rỗng.
- Dùng `textContent` và `createElement` để render dữ liệu an toàn.

## Giai đoạn 5: Kiểm thử
- Chạy bằng Live Server hoặc static server.
- Kiểm tra CSV tải thành công trong Network tab.
- Kiểm tra các kích thước 375px, 768px, 1440px.
- Thử đổi dữ liệu CSV và tải lại trang.
- Thử đổi tên tạm một file CSV để kiểm tra trạng thái lỗi.
- Kiểm tra bàn phím, focus, alt text và console.

## Ràng buộc không được vi phạm
- Không tạo backend, API server, Node.js server hoặc database server.
- Không dùng React, Vue, Angular, jQuery hay framework khác.
- Không thêm thư viện ngoài nếu không thật sự cần thiết.
- Không dùng `localStorage` làm database thay thế CSV.
- Không giả lập chức năng đặt hàng/thanh toán như thể giao dịch thật.
- Không tự tạo số liệu kinh doanh, đánh giá khách hàng hoặc tuyên bố khuyến mãi có thật.

## Prompt yêu cầu AI hoàn thành
Sau khi đọc toàn bộ tài liệu Markdown, hãy xây dựng landing page theo đúng yêu cầu. Trước khi kết thúc, hãy tự rà soát cấu trúc file, kiểm tra đường dẫn tương đối, kiểm tra cú pháp JavaScript và CSS, xác nhận CSV tải bằng static server, và báo cáo những phần còn là dữ liệu minh họa.
