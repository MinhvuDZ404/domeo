# Phát hành Domeo 3.0

Tài liệu này là danh sách việc cần kiểm tra trước và sau khi đưa bản 3.0 lên nhánh triển khai, kèm
phần nói rõ **điều gì đã được kiểm chứng và điều gì chưa**.

## 1. Bản này là gì

- Nhánh: `main` (GitHub Pages phục vụ trực tiếp từ nhánh này, thư mục gốc).
- Trang: <https://minhvudz404.github.io/domeo/>
- Phiên bản game: `3.0.0` (`src/config.js`, `package.json`).
- Phiên bản cấu trúc bản lưu: `SAVE_VERSION = 1` — **không đổi** so với 2.0.
- Bản 3.0 hoàn thiện trải nghiệm của vòng chơi 2.0. Các mốc v2.1–v2.5 trong lộ trình (bảo vệ bản
  lưu nâng cao, rương/bàn chế tạo, vùng sinh thái, nhiệm vụ, chiến đấu) **không** nằm trong bản này.

## 2. Đã kiểm chứng trong quá trình soạn bản

| Nội dung                                 | Kết quả                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm test` (65 kiểm thử logic)           | Đạt: game, thế giới, lưu trữ, cài đặt, hợp đồng HTML/mã/icon, hiệu năng, nạp bản lưu 2.0 |
| `npm run perf:check`                     | Đạt, xem số đo trong `docs/PERFORMANCE.md`                                               |
| `npm run balance`                        | Chạy được, số đo trong `docs/BALANCE.md`                                                 |
| `npm run format:check`                   | Đạt                                                                                      |
| Nạp bản lưu định dạng 2.0 rồi chơi tiếp  | Có kiểm thử tự động (`tests/upgrade.test.js`)                                            |
| Không gọi mạng/tài nguyên ngoài khi chơi | Giữ nguyên như 2.0; âm thanh môi trường được tổng hợp trong trình duyệt                  |

## 3. Chưa kiểm chứng (cần bạn xác nhận)

- **Chưa chạy bộ kiểm thử trình duyệt trong môi trường soạn bản** vì không tải được Chromium ở đó;
  bộ này sẽ chạy trên GitHub Actions khi mở pull request. Nếu CI báo lỗi, sửa trước khi gộp.
- **Chưa thử trên điện thoại thật.** Mô phỏng kích thước màn hình trong kiểm thử không thay thế
  thiết bị thật. Roadmap yêu cầu ít nhất một máy Android/Chrome và một iPhone/Safari trước khi
  khẳng định hỗ trợ — việc đó vẫn đang chờ.
- **Chưa đo FPS thật trong trình duyệt** (xem mục cuối của `docs/PERFORMANCE.md`).

## 4. Việc cần làm trước khi gộp

- [ ] CI trên pull request xanh (định dạng, 65 kiểm thử logic, 20 kịch bản trình duyệt).
- [ ] Mở bản xem trước, chơi thử: mới → hái quả → chế tạo rìu → chặt cây → lửa trại → qua một đêm.
- [ ] Mở Cài đặt (`O`), thử âm lượng, âm thanh môi trường, giảm chuyển động, bảng thông số; tải lại
      trang và kiểm tra cài đặt còn nguyên.
- [ ] Thử tiếp tục một hành trình cũ (nếu có) và xác nhận vị trí, vật phẩm, công trình không đổi.
- [ ] Thử trên một điện thoại thật: joystick, nút hái lượm, mở túi đồ, mở cài đặt, và kiểm tra
      không có nút nào bị cắt khỏi màn hình.
- [ ] Ghi lại kết quả (thiết bị, trình duyệt, FPS trung bình) vào bảng dưới.

### Bảng ghi kết quả thử thiết bị

| Thiết bị | Trình duyệt | FPS trung bình | Ghi chú |
| -------- | ----------- | -------------- | ------- |
|          |             |                |         |

## 5. Sau khi gộp

1. GitHub Actions chạy `pages build and deployment` cho nhánh `main`.
2. Mở <https://minhvudz404.github.io/domeo/>, xác nhận chân trang hiển thị `v3.0` và mục Cài đặt mở
   được bằng phím `O`.
3. Kiểm tra `localStorage` của một hành trình cũ vẫn nạp được trên trang thật (không chỉ ở máy).
4. Nếu phát hiện lỗi chặn chơi:

```sh
git revert --no-edit <commit-merge-cua-ban-3.0>
git push origin main
```

Quy trình này đưa trang về đúng bản 2.0 đã phát hành. Bản lưu của người chơi **không bị ảnh hưởng**
theo cả hai chiều, vì cấu trúc bản lưu không thay đổi.

## 6. Vì sao chưa làm PWA/ngoại tuyến

Roadmap xếp PWA vào phần bổ sung, không chặn phát hành. Bản 3.0 chưa làm vì:

- Cần kế hoạch đặt tên và xoá cache theo phiên bản, nếu không người chơi có thể chạy mã cũ trộn với
  tài nguyên mới.
- Cần cách thông báo "có bản mới" mà không ép đổi mã giữa lúc đang chơi.
- Bộ kiểm thử trình duyệt hiện tại chưa bao phủ service worker; thêm PWA mà không có kiểm thử tương
  ứng sẽ làm bản phát hành khó kiểm soát hơn.

Khi làm, hãy bắt đầu bằng: tệp kê khai (manifest) và biểu tượng, service worker chỉ cho tài nguyên
tĩnh với tên cache gắn phiên bản, và một kiểm thử ngoại tuyến thật trong `tests/e2e/`.
