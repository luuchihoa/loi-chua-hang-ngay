# Render audio ngắn bằng Google Colab

Notebook: [`notebooks/Loi_Chua_Audio_Colab.ipynb`](../notebooks/Loi_Chua_Audio_Colab.ipynb)

## Chuẩn bị lần đầu

1. Mở Google Colab và upload notebook.
2. Chọn **Runtime → Change runtime type → T4 GPU**.
3. Chạy lần lượt các cell từ 1 đến 7.
4. Khi cell 3 yêu cầu, upload đúng file mẫu cho từng giọng:
   - `hao`: `voice_hao.mp3`
   - `giang`: `voice_giang - northern female narrator.mp3`
   - `trieu_duong`: `voice_trieu duong -deep, calm and resonant.mp3`
5. Cell 4 đã được điền transcript nhận dạng từ chính ba file mẫu hiện tại. Chỉ sửa nếu sau này bạn thay file giọng. Transcript giúp clone giọng nhanh và chính xác hơn, đồng thời tránh phải tải thêm model nhận dạng giọng nói.

Model cache, voice và kết quả được giữ tại `MyDrive/LoiChuaAudio`.

## Mỗi lần sử dụng

1. Mở notebook và bật T4 GPU.
2. Chạy lại cell 1, 2, 3, 4, 5 và 6.
3. Thay nội dung trong cell 7 rồi chạy cell đó.
4. Muốn render bài khác, chỉ sửa và chạy lại cell 7.
5. Khi hoàn tất, chọn **Runtime → Disconnect and delete runtime**.

File MP3 được phân loại tự động:

```text
MyDrive/LoiChuaAudio/outputs/readings/r1.mp3       # lời dẫn “Bài đọc 1”
MyDrive/LoiChuaAudio/outputs/readings/r2.mp3       # lời dẫn “Bài đọc 2”
MyDrive/LoiChuaAudio/outputs/readings/<ref>.mp3    # nội dung dùng chung cho R1/R2
MyDrive/LoiChuaAudio/outputs/gospels
```

## Lưu ý

- Notebook được pin ở OmniVoice Studio `v0.4.0` để tránh thay đổi dependency bất ngờ.
- Mỗi phiên chỉ tải model lên GPU một lần. Cell render có thể chạy lại nhiều lần.
- `OVERWRITE = False` sẽ tái sử dụng file đã có; bật thành `True` khi muốn tạo lại.
- Chỉ sử dụng voice mẫu mà bạn có quyền sử dụng.
- Xem [quy ước tên file MP3](AUDIO_FILE_NAMING.md) trước khi render hoặc upload.
