# Design Guide – Giao diện

## 1. Định hướng
Phong cách quảng cáo thức ăn nhanh: tương phản mạnh, vui tươi, hiện đại, hình ảnh món ăn là điểm nhấn. Tránh sao chép nguyên xi website chính thức hoặc sử dụng logo có bản quyền khi chưa được phép.

## 2. Màu sắc gợi ý
- Đỏ chủ đạo: `#C8102E`
- Đỏ đậm: `#9E1025`
- Trắng: `#FFFFFF`
- Đen than: `#171717`
- Kem nhạt nền phụ: `#FFF7F0`
- Xám chữ phụ: `#666666`

Dùng màu đỏ cho CTA và điểm nhấn; nền trắng/kem giúp nội dung dễ đọc. Đảm bảo độ tương phản chữ/nền.

## 3. Typography
- Ưu tiên font hệ thống: `Arial`, `Helvetica`, sans-serif.
- Tiêu đề lớn, đậm, ngắn.
- Nội dung đoạn văn thoáng, dễ đọc.
- Không tải font ngoài để tránh phụ thuộc mạng và tăng dung lượng.

## 4. Bố cục
- Container tối đa khoảng 1140px, căn giữa.
- Header gọn, có thể sticky nhưng không che nội dung.
- Hero chia 2 cột trên desktop, xếp 1 cột trên mobile.
- Thẻ sản phẩm dùng grid: 3 cột desktop, 2 cột tablet, 1 cột mobile (tùy không gian).
- CTA dạng nút bo góc vừa phải, có trạng thái hover/focus.
- Khoảng cách section rõ ràng, không nhồi quá nhiều nội dung.

## 5. Hình ảnh nhẹ
Ưu tiên theo thứ tự:
1. SVG tự tạo, ít path và không nhúng ảnh raster.
2. Minh họa bằng CSS (hình tròn, khối, gradient nhẹ).
3. Ảnh WebP/JPG được nén, cắt đúng kích thước hiển thị.

Không tải ảnh từ nguồn không rõ bản quyền. Không dùng ảnh nền lớn hoặc video tự chạy. Đặt `width` và `height` cho ảnh để hạn chế layout shift; dùng `loading="lazy"` cho ảnh dưới màn hình đầu tiên.

## 6. Responsive và accessibility
- Thiết kế mobile-first.
- Menu mobile có nút mở/đóng, trạng thái `aria-expanded`.
- Dùng semantic HTML: `header`, `nav`, `main`, `section`, `article`, `footer`.
- Mọi ảnh có `alt` phù hợp; ảnh trang trí dùng `alt=""`.
- Nút có focus state rõ ràng; thao tác được bằng bàn phím.
- Tôn trọng `prefers-reduced-motion`.
