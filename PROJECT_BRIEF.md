# Project Brief – Landing Page quảng cáo gà rán KFC

## 1. Vai trò
Bạn là frontend developer kiêm UI/UX designer. Hãy tạo một landing page quảng cáo món gà rán theo tinh thần nhận diện quen thuộc của KFC: nổi bật, trẻ trung, ngon miệng, dễ đặt món. Đây là dự án thực hành độc lập, không giả mạo website chính thức.

## 2. Mục tiêu trang
- Thu hút sự chú ý ngay khi người dùng truy cập.
- Giới thiệu món gà rán và một số combo.
- Trình bày ưu đãi minh họa.
- Dẫn người dùng đến nút CTA như “Khám phá thực đơn” hoặc “Tìm hiểu ưu đãi”.
- Tạo trải nghiệm tốt trên điện thoại, máy tính bảng và desktop.

## 3. Đối tượng
Người dùng phổ thông, đặc biệt là người trẻ, gia đình và nhóm bạn đang tìm món ăn nhanh.

## 4. Nội dung và các khu vực
1. **Header:** tên thương hiệu dạng chữ, menu neo đến các phần trên trang, nút CTA.
2. **Hero:** tiêu đề ngắn, mô tả hấp dẫn, CTA chính/phụ và hình minh họa gà rán đơn giản.
3. **Sản phẩm nổi bật:** hiển thị danh sách sản phẩm lấy từ `products.csv`; mỗi thẻ gồm tên, mô tả, giá minh họa và nhãn nổi bật nếu có.
4. **Ưu đãi:** hiển thị các chương trình từ `promotions.csv`; ghi rõ điều kiện và ngày hiệu lực.
5. **Vì sao chọn chúng tôi:** 3–4 điểm nhấn ngắn, không đưa ra tuyên bố sức khỏe hoặc chất lượng chưa được kiểm chứng.
6. **FAQ:** câu hỏi thường gặp lấy từ `faqs.csv`.
7. **CTA cuối trang:** lời kêu gọi hành động.
8. **Footer:** thông tin dự án học tập, liên kết điều hướng và tuyên bố không phải website chính thức.

## 5. Chức năng
- Menu điều hướng cuộn đến từng section.
- Nút CTA cuộn đến khu vực sản phẩm/ưu đãi.
- Đọc dữ liệu CSV ở client-side bằng `fetch()`.
- Hiển thị sản phẩm, ưu đãi và FAQ động từ CSV.
- Nút lọc sản phẩm theo danh mục (nếu có dữ liệu phù hợp).
- FAQ dạng accordion có thể mở/đóng.
- Hiển thị trạng thái tải và thông báo lỗi khi CSV không đọc được.
- Nút quay lại đầu trang (tùy chọn).

## 6. Ngoài phạm vi
- Không có giỏ hàng thực, thanh toán, đăng nhập hay quản lý đơn hàng.
- Không có backend hoặc API.
- Không ghi dữ liệu vào database server.
- Không tuyên bố đặt món thành công. CTA chỉ có thể là liên kết minh họa hoặc điều hướng nội bộ.

## 7. Tiêu chí nghiệm thu
- Mở được trang bằng máy chủ tĩnh/Live Server.
- Không có lỗi JavaScript trong console.
- Dữ liệu CSV được đọc và hiển thị chính xác.
- Bố cục responsive ở chiều rộng 375px, 768px và 1440px.
- Có trạng thái dự phòng nếu CSV lỗi.
- Không sử dụng ảnh dung lượng lớn; tổng dung lượng asset ảnh nên được giữ ở mức thấp (mục tiêu dưới 500 KB).
- Nội dung thể hiện rõ đây là dự án học tập độc lập, không phải website chính thức của KFC.
