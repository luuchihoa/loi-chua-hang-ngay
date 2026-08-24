# QUY ƯỚC ĐẶT TÊN FILE MP3 — LỜI CHÚA MỖI NGÀY

Hãy dùng chính xác quy ước này khi xuất MP3. Không tạo manifest và không thêm tiền tố `r1_` hoặc `r2_` vào file nội dung.

## 1. Cấu trúc thư mục

```text
readings/
  r1.mp3                              # chỉ đọc: “Bài đọc 1”
  r2.mp3                              # chỉ đọc: “Bài đọc 2”
  <ref-chuan>.mp3                     # nội dung Kinh Thánh, dùng chung cho R1/R2

gospels/
  <ref-chuan>.mp3                     # nội dung Tin Mừng

music/
  liturgy_intro_v5.mp3                # phát trước playlist đầy đủ
  reading_transition_v5.mp3           # phát giữa hai bài đọc
  liturgy_outro_v5.mp3                # phát sau bài cuối
```

## 2. Quy tắc tạo `<ref-chuan>`

Từ trường `ref` trong database:

1. Chuẩn hoá Unicode NFC và xoá khoảng trắng đầu/cuối.
2. Xoá dấu câu cuối trích dẫn: `.`, `,`, `:`, `;`.
3. Xoá ký tự không hợp lệ trong tên file: `(` `)` `\\` `/` `*` `?` `"` `<` `>` `|`.
4. Thay dấu phân tách chương/câu `,`, `:` hoặc `.` bằng `v`.
5. Thay dấu chỉ khoảng câu `-` bằng `_to_`.
6. Thay dấu ngăn nhiều đoạn `;` bằng `_and_`.
7. Thay một hoặc nhiều khoảng trắng bằng `_`; gộp `_` lặp; bỏ `_` ở đầu/cuối.

## 3. Ví dụ bắt buộc

| `ref` trong database | File Bài đọc | File Tin Mừng |
| --- | --- | --- |
| `Is 22,19-23` | `readings/Is_22v19_to_23.mp3` | `gospels/Is_22v19_to_23.mp3` |
| `1 Cr 1,11-12` | `readings/1_Cr_1v11_to_12.mp3` | `gospels/1_Cr_1v11_to_12.mp3` |
| `1 Cr 11,1-12` | `readings/1_Cr_11v1_to_12.mp3` | `gospels/1_Cr_11v1_to_12.mp3` |
| `Đn 7,9-10.13-14` | `readings/Đn_7v9_to_10v13_to_14.mp3` | `gospels/Đn_7v9_to_10v13_to_14.mp3` |
| `Ed 9,1-7;10,18-22` | `readings/Ed_9v1_to_7_and_10v18_to_22.mp3` | `gospels/Ed_9v1_to_7_and_10v18_to_22.mp3` |

Hai ref khác nhau phải luôn sinh ra hai tên khác nhau. Ví dụ `1 Cr 1,11-12` và `1 Cr 11,1-12` **không được** cùng tên.

## 4. Nội dung audio

- `readings/r1.mp3`: chỉ câu “Bài đọc 1”.
- `readings/r2.mp3`: chỉ câu “Bài đọc 2”.
- Mọi `readings/<ref-chuan>.mp3`: chỉ đọc lời dẫn Kinh Thánh riêng của trích dẫn và nội dung; **không đọc lại** “Bài đọc 1” hoặc “Bài đọc 2”.
- Mọi `gospels/<ref-chuan>.mp3`: chỉ đọc lời dẫn và nội dung Tin Mừng.
- Các file trong `music/` là nhạc không lời dùng chung, không gắn với `ref` và không dùng khi nghe riêng một bài đọc.
- Nhạc nền dưới giọng đọc phải được mix sẵn trong file nội dung; trình duyệt không phát nhạc nền song song.

## 5. Pseudocode

```text
slug = ref.trim()
slug = unicodeNormalizeNFC(slug)
slug = removeTrailing(slug, ".,:;")
slug = removeCharacters(slug, "()\\/*?\"<>")
slug = replace(slug, /\s*[,.:]\s*/, "v")
slug = replace(slug, /\s*-\s*/, "_to_")
slug = replace(slug, /\s*;\s*/, "_and_")
slug = replace(slug, /\s+/, "_")
slug = collapseAndTrimUnderscores(slug)

if section is "gospel":
  output = "gospels/" + slug + ".mp3"
else:
  output = "readings/" + slug + ".mp3"
```
