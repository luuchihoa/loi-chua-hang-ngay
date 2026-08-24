# Quy ước tên file MP3 phụng vụ

`ref` trong database là nguồn dữ liệu duy nhất để suy ra tên file. Trình phát không cần manifest.

| Loại | Đường dẫn | Ví dụ ref `1 Cr 13,1 - 13` |
| --- | --- | --- |
| Lời dẫn Bài đọc 1 | `readings/r1.mp3` | cố định |
| Lời dẫn Bài đọc 2 | `readings/r2.mp3` | cố định |
| Nội dung Bài đọc 1 hoặc 2 | `readings/<ref-chuẩn>.mp3` | `readings/1_Cr_13v1_to_13.mp3` |
| Tin Mừng | `gospels/<ref-chuẩn>.mp3` | `gospels/1_Cr_13v1_to_13.mp3` |

## Nhạc phát toàn bộ

Các file này là nhạc không lời chung, chỉ xuất hiện khi phát toàn bộ bài đọc:

```text
music/liturgy_intro_v1.mp3
music/reading_transition_v1.mp3
music/liturgy_outro_v1.mp3
```

Không phát các file này khi nghe riêng một bài đọc. Nhạc nền dưới giọng đọc phải được mix sẵn trong file nội dung theo `ref`; không phát song song trong trình duyệt.

## Chuẩn hoá `ref`

1. Chuẩn hoá Unicode NFC và bỏ khoảng trắng đầu/cuối.
2. Bỏ các ký tự không an toàn `( ) \\ / * ? " < > |`.
3. Dấu phân tách chương/câu `,`, `:` hoặc `.` trở thành `v`; khoảng câu `-` trở thành `_to_`; các cụm phân tách bằng `;` trở thành `_and_`.
4. Một hoặc nhiều khoảng trắng trở thành `_`; các `_` lặp hay ở đầu/cuối bị bỏ.

Ví dụ: `1 Cr 13,1 - 13` → `1_Cr_13v1_to_13`.

Vì vậy `1 Cr 1,11-12` → `1_Cr_1v11_to_12.mp3`, còn `1 Cr 11,1-12` → `1_Cr_11v1_to_12.mp3`: hai file luôn khác nhau.

Không được thêm tiền tố `r1_` hay `r2_` vào file nội dung. Điều này bảo đảm cùng một trích dẫn chỉ lưu và render một lần. File cũ trong `readings/r1/` và `readings/r2/` chỉ là tương thích tạm thời ở local server; không dùng để tạo mới.
