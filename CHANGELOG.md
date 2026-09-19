# Nhật ký thay đổi

Mọi thay đổi đáng chú ý của Domeo được ghi ở đây. Game hiển thị phiên bản trong mục **Cài đặt**
(phím `O`, phần cuối hộp thoại) và ở `src/config.js`.

## 3.0.0 — 19/09/2026

Bản này hoàn thiện trải nghiệm của vòng chơi hiện có (khám phá, hái lượm, chế tạo, dựng chỗ dừng
chân). **Không thêm hệ thống chơi mới**: rương, vùng sinh thái, nhiệm vụ và chiến đấu trong lộ
trình vẫn đang chờ, xem `docs/ROADMAP.md`.

### Cài đặt và trải nghiệm

- Thêm mục **Cài đặt** (nút bánh răng, phím `O`, và nút trong màn hình tạm dừng): âm lượng, âm
  thanh môi trường, hiệu ứng khi hái lượm, giảm chuyển động, bảng thông số và nút trả về mặc định.
- Cài đặt được lưu riêng (`domeo.settings.v1`), không liên quan tới bản lưu hành trình; giá trị
  hỏng hoặc bị sửa tay sẽ được đưa về mặc định chứ không làm hỏng game. Khi trình duyệt chặn bộ nhớ,
  game vẫn dùng được cài đặt trong phiên và báo rõ.
- Phím `M` bật/tắt âm thanh nhanh như nút loa.
- "Giảm chuyển động" có thể bật/tắt thủ công, ghi đè thiết lập của hệ điều hành.

### Âm thanh

- Thêm lớp **âm thanh môi trường** tổng hợp bằng Web Audio (tiếng gió và chim buổi sáng/chiều),
  mặc định bật nhưng chỉ nghe thấy khi bạn đã bật âm thanh. Không dùng tệp ngoài, không tải mạng.
- Tiếng thông báo khi bị từ chối hành động, tách khỏi tiếng hái lượm.
- Âm thanh tự giảm khi chuyển tab hoặc ẩn trang, và không khởi tạo AudioContext trước khi người
  chơi bấm nút âm thanh.

### Phản hồi và hình ảnh

- Hạt nhỏ khi hái lượm (lá, đá), tia lửa khi dựng công trình, vòng đỏ khi hành động không hợp lệ.
- Khung nhắc tương tác rung nhẹ khi hành động bị từ chối, kèm lời nhắc như cũ.
- Thang màu theo thời gian trong ngày: ấm ở bình minh/hoàng hôn, lạnh và tối hơn về đêm.
- Giới hạn 120 hạt và 6 nguồn sáng gần nhất để hiệu ứng không ăn mất khung hình.

### Hiệu năng

- Chỉ số gần đúng ở phần logic: thời gian xử lý mỗi bước giảm khoảng **46%**, truy vấn vật thể
  giảm khoảng **58%** (đo bằng `npm run perf`, chi tiết trong `docs/PERFORMANCE.md`).
- Thêm `npm run perf` và `npm run perf:check`: kiểm tra ngân sách hiệu năng ngay trong CI.
- Thêm **bảng thông số** (`?debug=1` hoặc trong Cài đặt) để tự đo FPS trên thiết bị thật.
- Nén lại sprite nhân vật **không mất dữ liệu**: `player_walk_new.png` từ 1,40 MB xuống 1,21 MB
  (−15%) với từng điểm ảnh giữ nguyên. Đã thử giảm còn 256 màu (nhẹ hơn 76%) nhưng **loại bỏ**: nó
  làm mất kênh alpha mềm và khiến việc cắt khung hình trong `renderer.js` lệch đi 1 px mỗi khung —
  xem `docs/PERFORMANCE.md`.

### Cân bằng

- Ghi lại số đo nhịp chơi bằng `scripts/balance.mjs` và `docs/BALANCE.md`.
- Gom các hằng số sinh tồn vào `src/config.js` (nhóm "Survival tuning") để chỉnh cân bằng ở một chỗ.
- **Không đổi luật chơi và không đổi định dạng bản lưu**: giá trị vẫn như 2.0, hành trình cũ chơi
  tiếp được ngay.

### Giao diện điện thoại

- Nút trên thanh trên cùng và nút đóng hộp thoại to hơn (42 px) trên thiết bị cảm ứng.
- Trên màn hình rất hẹp (dưới 460 px) thanh trên cùng bỏ nút lưu, dưới 380 px bỏ luôn nút cài đặt;
  cả hai chức năng vẫn còn trong màn hình tạm dừng, nên không có nút nào tràn ra ngoài màn hình.

### Kiểm thử và tài liệu

- Bộ kiểm thử logic: 42 → **65** kiểm thử, gồm cài đặt, hợp đồng giữa HTML/mã/icon, chỉ mục công
  trình và khả năng nạp bản lưu 2.0.
- Bộ kiểm thử trình duyệt: 14 → **20** kịch bản, gồm cài đặt, phản hồi bị từ chối, bảng thông số và
  bố cục điện thoại.
- Thêm `README.md` cập nhật, `docs/PERFORMANCE.md`, `docs/BALANCE.md`, `docs/RELEASE-3.0.md`.

### Còn thiếu so với lộ trình

- Chưa có xuất/nhập bản lưu, sao lưu định kỳ hay phát hiện hai tab (v2.1).
- Chưa có rương, bàn chế tạo, tường/cửa hay nấu ăn (v2.2).
- Chưa có vùng sinh thái, bản đồ, địa điểm (v2.3); chưa có nhiệm vụ/nhật ký (v2.4); chưa có chiến
  đấu (v2.5).
- Chưa hỗ trợ PWA/ngoại tuyến; lý do và cách làm an toàn được ghi trong `docs/RELEASE-3.0.md`.
