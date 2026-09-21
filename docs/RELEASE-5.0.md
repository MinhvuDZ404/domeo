# Phát hành Domeo 5.0

Tài liệu này là danh sách việc cần kiểm tra trước và sau khi đưa bản 5.0 lên nhánh triển khai, kèm
phần nói rõ **điều gì đã được kiểm chứng và điều gì chưa**.

## 1. Bản này là gì

- Nhánh: `main` (GitHub Pages phục vụ trực tiếp từ nhánh này, thư mục gốc).
- Trang: <https://minhvudz404.github.io/domeo/>
- Phiên bản game: `5.0.0` (`src/config.js`, `package.json`).
- Phiên bản cấu trúc bản lưu: `SAVE_VERSION = 3` (tên khóa `localStorage` vẫn là
  `domeo.journey.v1` để không mất bản lưu nào).
- Phiên bản thuật toán sinh thế giới: `WORLD_GEN_VERSION = 2` cho hành trình mới; hành trình cũ
  giữ `generationVersion = 1` và thế giới không đổi một điểm ảnh.
- Bản 5.0 làm phần lớn v2.3 (vùng sinh thái, địa danh) và một phần v2.4 (nhật ký 11 bước) trong lộ
  trình. Chiến đấu (v2.5), bàn chế tạo, tường/cửa và PWA **không** nằm trong bản này.

## 2. Đã kiểm chứng trong quá trình soạn bản

| Nội dung                                        | Kết quả                                                                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm test` (89 kiểm thử logic)                  | Đạt: game, thế giới, lưu trữ, cài đặt, hợp đồng HTML/mã/icon, hiệu năng, nạp bản lưu 2.0 và 4.0 |
| `npm run perf:check`                            | Đạt, xem số đo trong `docs/PERFORMANCE.md`                                                      |
| `npm run balance`                               | Chạy được, số đo trong `docs/BALANCE.md`                                                        |
| `npm run format:check`                          | Đạt                                                                                             |
| Nạp bản lưu 2.0/4.0 rồi chơi tiếp               | Có kiểm thử tự động (`tests/upgrade.test.js`); thế giới cũ giữ nguyên                           |
| Không gọi mạng/tài nguyên ngoài khi chơi        | Giữ nguyên; âm thanh và hình ảnh mới đều tổng hợp trong trình duyệt                             |
| Mọi selector trong kịch bản trình duyệt tồn tại | Đã rà soát tĩnh (không chạy được Chromium trong môi trường soạn bản, xem mục 3)                 |
| Luồng hái nấm → chế cao dán → dựng đèn lồng     | Đã mô phỏng bằng chính logic game trong Node, kết quả khớp kỳ vọng của kịch bản trình duyệt     |
| Khám phá địa danh → quà → lưu                   | Đã mô phỏng tương tự; quà chỉ nhận một lần, tồn tại sau tải lại                                 |

## 3. Chưa kiểm chứng (cần bạn xác nhận)

- **Chưa chạy được kịch bản trình duyệt tại máy.** Môi trường soạn bản không tải được Chromium
  (mạng chặn CDN của Playwright), giống như bản 3.0. Hãy mở pull request sớm để CI chạy 24 kịch bản
  thay — xem bài học trong `docs/RELEASE-3.0.md` mục 3b.
- **Chưa thử trên điện thoại thật.** Mô phỏng kích thước màn hình trong kiểm thử không thay thế
  thiết bị thật. Roadmap yêu cầu ít nhất một máy Android/Chrome và một iPhone/Safari trước khi
  khẳng định hỗ trợ — việc đó vẫn đang chờ.
- **Chưa đo FPS thật trong trình duyệt** (xem mục cuối của `docs/PERFORMANCE.md`).

## 4. Việc cần làm trước khi gộp

- [ ] CI trên pull request xanh (định dạng, 89 kiểm thử logic, ngân sách hiệu năng, báo cáo cân
      bằng, 24 kịch bản trình duyệt).
- [ ] Mở bản xem trước, chơi thử: mới → hái quả → chế tạo rìu → chặt cây → lửa trại → hái nấm →
      chế cao dán → đi tới địa danh gần nhất → qua một đêm.
- [ ] Mở Cài đặt (`O`), thử chất lượng hình ảnh, rung camera, âm lượng, âm thanh môi trường, giảm
      chuyển động, bảng thông số; tải lại trang và kiểm tra cài đặt còn nguyên.
- [ ] Thử tiếp tục một hành trình cũ 2.0/3.0/4.0 (nếu có) và xác nhận vị trí, vật phẩm, công trình
      và thế giới không đổi.
- [ ] Thử trên một điện thoại thật: joystick, nút hái lượm, mở túi đồ, mở cài đặt, và kiểm tra
      không có nút nào bị cắt khỏi màn hình.
- [ ] Ghi lại kết quả (thiết bị, trình duyệt, FPS trung bình) vào bảng dưới.

### Bảng ghi kết quả thử thiết bị

| Thiết bị | Trình duyệt | FPS trung bình | Ghi chú |
| -------- | ----------- | -------------- | ------- |
|          |             |                |         |

## 5. Sau khi gộp

1. GitHub Actions chạy `pages build and deployment` cho nhánh `main`.
2. Mở <https://minhvudz404.github.io/domeo/>, xác nhận chân trang hiển thị `v5.0` và mục Cài đặt mở
   được bằng phím `O`.
3. Kiểm tra `localStorage` của một hành trình cũ vẫn nạp được trên trang thật (không chỉ ở máy).
4. Nếu phát hiện lỗi chặn chơi:

```sh
git revert --no-edit <commit-merge-cua-ban-5.0>
git push origin main
```

Quy trình này đưa trang về đúng bản 4.0.1 đã phát hành. Lưu ý: bản lưu đã được 5.0 ghi ở schema 3
sẽ **không** đọc được trên bản 4.x (bản 4.x từ chối phiên bản lạ chứ không xóa); người chơi cần
giữ bản 5.0 hoặc bắt đầu hành trình mới trên bản cũ. Đây là lý do mục 4 yêu cầu thử bản lưu cũ
trước khi gộp.
