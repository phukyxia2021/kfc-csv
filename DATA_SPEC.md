# Data Specification – CSV

## 1. Nguyên tắc
CSV là nguồn dữ liệu tĩnh, được tải và xử lý hoàn toàn trong trình duyệt. Đây không phải database có khả năng ghi/cập nhật từ website. Để thay đổi nội dung, người phát triển chỉnh sửa file CSV thủ công.

- Encoding: UTF-8.
- Dấu phân cách: dấu phẩy `,`.
- Dòng đầu tiên là tên cột.
- Nếu một giá trị có dấu phẩy, đặt toàn bộ giá trị trong dấu ngoặc kép.
- Dùng dấu chấm làm dấu thập phân nếu cần.
- Không đưa dữ liệu cá nhân hoặc thông tin bí mật vào CSV.

## 2. `data/products.csv`

Các cột:

| Cột | Ý nghĩa | Ví dụ |
|---|---|---|
| id | Mã duy nhất | P001 |
| name | Tên sản phẩm | Gà rán giòn |
| category | Danh mục | Chicken |
| description | Mô tả ngắn | Miếng gà rán vàng giòn |
| price | Giá minh họa dạng số VND | 45000 |
| badge | Nhãn tùy chọn | Bán chạy |
| image | Đường dẫn ảnh tương đối | assets/images/chicken.svg |
| featured | `true` hoặc `false` | true |

Dữ liệu giá chỉ là mẫu, không đại diện giá bán thực tế.

## 3. `data/promotions.csv`

Các cột:
`id,title,description,discount_label,valid_from,valid_to,terms,active`

- `active`: `true` hoặc `false`.
- Ngày dùng định dạng `YYYY-MM-DD`.
- Ghi điều kiện áp dụng rõ ràng.
- Không hiển thị ưu đãi đã hết hạn như ưu đãi còn hiệu lực.

## 4. `data/faqs.csv`

Các cột:
`id,question,answer,sort_order,active`

- `sort_order`: số nguyên để sắp xếp.
- `active`: `true` hoặc `false`.

## 5. Quy tắc đọc CSV
- Viết hàm `parseCSV(text)` xử lý dấu phẩy trong trường được bao bởi dấu ngoặc kép, dấu ngoặc kép kép và xuống dòng trong trường.
- Không dùng `split(",")` đơn giản vì sẽ sai khi nội dung có dấu phẩy.
- Kiểm tra response `response.ok` trước khi đọc.
- Kiểm tra dữ liệu bắt buộc và chuyển `price`, `sort_order` về kiểu số.
- Chèn nội dung động bằng `textContent`, không dùng `innerHTML` với dữ liệu CSV chưa được tin cậy.
- Nếu không tải được một file, hiển thị thông báo phù hợp cho riêng khu vực đó.

## 6. Hạn chế bảo mật và vận hành
CSV được tải xuống công khai cùng trang web. Không lưu API key, mật khẩu, thông tin thanh toán hoặc dữ liệu riêng tư trong CSV hay JavaScript. Không có backend nghĩa là không thể bảo vệ dữ liệu tĩnh khỏi người truy cập.
