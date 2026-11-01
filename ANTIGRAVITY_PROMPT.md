# Prompt chính dành cho Antigravity

Bạn hãy đóng vai trò Senior Frontend Developer và UI/UX Designer. Đọc kỹ các tài liệu:
- `README.md`
- `PROJECT_BRIEF.md`
- `DESIGN_GUIDE.md`
- `DATA_SPEC.md`
- `IMPLEMENTATION_PLAN.md`

Hãy tạo một landing page quảng cáo gà rán KFC phục vụ mục đích học tập, với các yêu cầu bắt buộc:

1. Chỉ sử dụng HTML5, CSS3 và JavaScript thuần.
2. Dữ liệu nội dung được lưu trong file CSV và tải bằng `fetch()` ở phía trình duyệt.
3. Không viết backend, không dùng database server, không dùng API ngoài.
4. Không sử dụng framework JavaScript hoặc thư viện nặng.
5. Hình ảnh phải đơn giản, nhẹ; ưu tiên SVG tự tạo hoặc CSS illustration.
6. Giao diện hiện đại, nổi bật, responsive, mobile-first.
7. Có header, hero, sản phẩm, ưu đãi, điểm nổi bật, FAQ và footer.
8. Dữ liệu sản phẩm, ưu đãi và FAQ phải được render từ CSV, không hardcode lặp lại trong HTML.
9. Xử lý lỗi khi CSV không tải được; không để trang trắng.
10. Không dùng `innerHTML` cho dữ liệu CSV; dùng `textContent`/DOM API.
11. Ghi chú rõ đây là dự án học tập độc lập, không phải website chính thức hoặc được KFC bảo trợ.
12. Giá và ưu đãi trong CSV là dữ liệu minh họa, phải ghi rõ để tránh gây hiểu nhầm.

Hãy tự tạo đầy đủ cấu trúc file, nội dung HTML/CSS/JS và CSV mẫu. Sau khi hoàn thành:
- Kiểm tra tất cả đường dẫn file.
- Kiểm tra parse CSV với dữ liệu có dấu phẩy và dấu ngoặc kép.
- Kiểm tra responsive ở mobile/tablet/desktop.
- Kiểm tra không có lỗi console.
- Đưa ra hướng dẫn chạy bằng Live Server hoặc static server.
- Không tuyên bố đã kiểm thử nếu chưa thực sự chạy kiểm thử.
