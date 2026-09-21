# Hiệu năng Domeo 5.0

Mục tiêu hiệu năng của Domeo không phải "nhanh hơn bằng mọi giá", mà là: **mỗi khung hình không
được tiêu quá nhiều thời gian cho những việc lẽ ra chỉ làm một lần**. Tài liệu này ghi lại đã đo
gì, đo bằng cách nào, kết quả ra sao và phần nào còn để ngỏ. Số đo 3.0 được giữ lại bên dưới để
so sánh.

## Bản 5.0: thế giới lớn hơn, ngân sách giữ nguyên

Bản 5.0 thêm vùng sinh thái (nhiễu giá trị theo seed), địa danh, thời tiết và kiểm tra khám phá mỗi
khung hình — nhưng ngân sách hiệu năng không đổi, và số đo vẫn nằm sâu trong ngân sách:

| Khối lượng việc | 3.0 (trung vị 5 lần) | 5.0 (trung vị 5 lần) | Ngân sách |
| --------------- | -------------------- | -------------------- | --------- |
| simulation mean | 0,040 ms             | 0,045 ms             | —         |
| simulation p95  | 0,089 ms             | 0,089 ms             | < 2,5 ms  |
| worldQuery mean | 0,100 ms             | 0,101 ms             | —         |
| worldQuery p95  | 0,200 ms             | 0,251 ms             | < 1,2 ms  |

Đo trên Node v22.22.3, cùng máy, cùng script `npm run perf`. Chi phí tăng không đáng kể vì:

- Kiểm tra khám phá địa danh chạy tối đa ~3 lần/giây thay vì mỗi bước (địa danh không di chuyển).
- Truy vấn địa danh không còn nạp thừa chunk nhờ tính đúng biên chunk cần thiết.
- Vùng sinh thái là nhiễu giá trị thuần túy theo tọa độ, không lưu thêm bộ nhớ.

Phần vẽ thêm cài đặt **chất lượng hình ảnh** (tự động/nhẹ/chuẩn/đẹp): chế độ tự động chọn mức theo
chiều rộng màn hình, giới hạn số hạt (60/120/180) và số nguồn sáng (4/8). Rung camera có thể tắt
riêng, và tự tắt khi bật giảm chuyển động.

## Đo phần logic (tự động, chạy được trong CI) — số liệu gốc 3.0

`scripts/perf.mjs` chạy hai khối lượng công việc bằng chính mã game, không cần trình duyệt:

- **simulation** — 3 phút trong game, 20 bước/giây, có di chuyển, hái lượm, ăn và 40 công trình
  đã dựng; đo `Game.update()` + `Game.getTarget()` + sự kiện mỗi bước.
- **worldQuery** — 900 truy vấn `World.getEntities()` trên khung nhìn 1200 × 800 px với 60 công
  trình, cộng `prune()`.

Chạy lại:

```sh
npm run perf          # in bảng số đo
npm run perf:check    # thoát với mã lỗi nếu vượt ngân sách
```

| Khối lượng việc | Trước 3.0 (trung vị 5 lần) | Sau 3.0 (trung vị 5 lần) | Thay đổi |
| --------------- | -------------------------- | ------------------------ | -------- |
| simulation mean | 0,074 ms                   | 0,040 ms                 | −46%     |
| simulation p95  | 0,158 ms                   | 0,089 ms                 | −44%     |
| worldQuery mean | 0,235 ms                   | 0,100 ms                 | −58%     |
| worldQuery p95  | 0,406 ms                   | 0,200 ms                 | −51%     |

Đo trên Node v22.22.3, một luồng, cùng máy, cùng bộ dữ liệu; "trước 3.0" là mã ở commit gốc của
nhánh này (`9c53a58`) chạy bằng đúng script trên. Với ngân sách 60 FPS (16,7 ms/khung) thì cả hai
phiên bản đều đã nằm trong giới hạn — phần logic chưa bao giờ là nút cổ chai. Việc giảm một nửa chi
phí ở đây có ý nghĩa với **điện thoại tầm trung và những máy chạy nền yếu**, nơi CPU bị chia sẻ.

### Đã sửa gì

| Vấn đề trước đây                                                                         | Cách xử lý trong 3.0                                                                                                               |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Mỗi vật thể trong tầm nhìn phải so khoảng cách với **toàn bộ** danh sách công trình      | `World.structureIndex()` chia công trình vào lưới ô 64 px và tự làm mới khi mảng công trình thay đổi; truy vấn chỉ xét 9 ô lân cận |
| `isBlocked()`/`canMove()` tạo mảng mới `[...nearby, ...structures]` ở mỗi bước di chuyển | Duyệt trực tiếp, chỉ hỏi công trình ở gần, không cấp phát mảng mỗi bước                                                            |
| Mỗi cụm hoa cỏ gọi `save/translate/restore` và đổi kiểu vẽ riêng                         | Cụm trang trí của mỗi chunk được phân nhóm một lần (lưu trong `WeakMap`) và vẽ theo lô; cụm ngoài khung nhìn bị bỏ qua             |
| Mọi lửa trại trong thế giới đều tạo một gradient ánh sáng mỗi khung hình                 | Chỉ 6 nguồn sáng gần nhất trong khung nhìn được vẽ                                                                                 |
| Hiệu ứng chữ nổi, bụi, hạt không có giới hạn                                             | Hạt bị giới hạn 120 hạt, tự tắt theo cài đặt "Hiệu ứng" hoặc "Giảm chuyển động"                                                    |

## Tài nguyên tải về

Tổng dung lượng tài nguyên của game (không tính mã) khoảng **1,6 MB**, trong đó sprite nhân vật
chiếm gần hết. Bản 3.0 nén lại sprite **không mất dữ liệu** (giữ nguyên từng điểm ảnh):

| Tệp                                  | Trước   | Sau     | Thay đổi |
| ------------------------------------ | ------- | ------- | -------- |
| `assets/sprites/player_walk_new.png` | 1,40 MB | 1,21 MB | −15%     |
| `assets/sprites/player_walk.png`     | 101 KB  | 99 KB   | −2%      |

Cách kiểm chứng: giải mã hai phiên bản bằng ImageMagick và so từng điểm ảnh — kết quả
`RMSE 0 (0)`, tức không có khác biệt nào. Kèm theo đó, kênh alpha được so từng byte và **kết quả cắt
khung hình** (`prepareFrames()` trong `renderer.js`) được tính lại cho cả 32 khung: giống hệt nhau.

**Đã thử và loại bỏ:** giảm sprite xuống 256 màu sẽ tiết kiệm thêm khoảng 1 MB (−76%), nhưng bản
giảm màu chỉ giữ 2 mức alpha (trong/ngoài) thay vì 256 mức như bản gốc. Hệ quả: viền nhân vật bị
răng cưa và việc cắt khung lệch 1 px ở phần lớn khung hình. Đổi 1 MB lấy việc mất viền mềm của nhân
vật là không đáng, nên bản 3.0 giữ bản nén không mất dữ liệu.

## Đo phần vẽ (cần thiết bị thật)

Phần vẽ khung hình chỉ đo được trong trình duyệt. Bản 3.0 có sẵn bảng thông số để bạn tự đo:

1. Mở game với `?debug=1`, hoặc bật **Bảng thông số** trong mục Cài đặt (phím `O`).
2. Chơi vài phút ở khu vực đông cây, ban đêm, có lửa trại.
3. Đọc `FPS`, `ms/khung`, số vật thể, số hạt và DPR ở góc dưới bên trái.

Mục tiêu để tham chiếu: **60 FPS trên máy tính để bàn** và **tối thiểu 30 FPS trên một điện thoại
tầm trung**. Nếu thấp hơn, hãy tắt "Hiệu ứng khi hái lượm" và bật "Giảm chuyển động" rồi đo lại —
bảng thông số sẽ cho biết chênh lệch.

> **Còn để ngỏ:** trong môi trường soạn bản 3.0 và 5.0 không có Chromium/Playwright cài sẵn
> (không tải được trình duyệt), nên **chưa có số đo khung hình thật trên trình duyệt hay trên điện
> thoại**. Bảng ở trên chỉ là phần logic. Hãy coi các con số FPS thực tế là việc cần bạn xác nhận
> trước khi tuyên bố hỗ trợ một thiết bị cụ thể — xem `docs/RELEASE-5.0.md`.

## Giới hạn đã biết

- DPR bị chặn ở 2 và tổng điểm ảnh bị giới hạn khoảng 8 triệu, để màn hình 4K/Retina không tự bắt
  máy yếu vẽ gấp bốn lần.
- Cache chunk tối đa 64 chunk (đã có từ 2.0); đi rất xa thì chunk cũ bị bỏ và sinh lại theo seed,
  không rò rỉ bộ nhớ.
- Bảng thông số chỉ là số đo hiển thị, không gửi dữ liệu đi đâu; game vẫn không có theo dõi hành vi
  và không gọi dịch vụ ngoài.
