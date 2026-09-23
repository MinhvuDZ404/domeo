# Nhật ký thay đổi

Mọi thay đổi đáng chú ý của Domeo được ghi ở đây. Game hiển thị phiên bản trong mục **Cài đặt**
(phím `O`, phần cuối hộp thoại) và ở `src/config.js`.

## 5.1.1 — 23/09/2026

Bản chỉnh nhịp cho 5.1: đêm vẫn nguy hiểm, nhưng người chơi đọc được nguy hiểm đó và có một chỗ để
quay về. Không đổi `SAVE_VERSION` (vẫn 4), không đổi `DAY_LENGTH` (1440), không đổi khóa
`localStorage`.

### Đã sửa

- Công trình không có phím tắt (lều, bàn chế tác, bàn bản đồ, đèn hiệu, ghế, bồn hoa, đá đứng) đặt
  được từ túi đồ. Trước đó nút “Mang ra đặt” chỉ nhận lửa, hàng rào, rương và đèn lồng.
- Bữa ăn, trà và cao dán dùng được từ túi đồ, không chỉ quả mọng.
- Đòn đánh của sinh vật không xuyên thân cây hay hàng rào, trừ đòn áp sát và đòn dậm đất. Bị đánh
  thì bị đẩy ra xa, không bị kéo vào nhát chém.
- Trong vòng lửa nhà, sinh vật thường bỏ cuộc. Một nhát đã vung vẫn trúng. Người giữ rừng cổ không
  bị lửa nhà đuổi đi.
- Vòng báo đòn của nấm phun bào tử không còn là một đĩa lớn bằng tầm bắn. Đêm vẽ lại mắt, vòng báo
  và viên đạn lên trên lớp tối, kèm một vũng sáng nhỏ quanh sinh vật đã thấy bạn.
- Nhát chém của người chơi theo hướng ngắm, không chỉ theo hướng mặt.
- Chết ghi đúng tên: đói, lạnh, hoặc tên sinh vật. Màn hình kết thúc nói vì sao và cách chuẩn bị
  khác đi. Tỉnh dậy vẫn giữ hành trình.

### Nhịp chơi

- Hoàng hôn và đêm mỗi ngày được nhắc một lần, kèm đường về nhà nếu đã có lửa.
- Lần đầu bị đói, lạnh, hoặc bị sinh vật thấy được nhắc một lần. Bản lưu nhớ các lời nhắc đó
  (`hints`, trường tùy chọn — bản lưu cũ không có trường này vẫn nạp được).
- Công thức bị khoá hoặc cần chỗ đứng nói rõ lý do, thay vì chỉ một nút tắt.
- Nghỉ ở lều hiện thời gian chờ còn lại.
- Trại cấp cao hơn có vòng đất ấm và vài viên đá đường. Lửa nhà sáng rộng hơn một chút.
- Trên màn hình cảm ứng, thẻ trại không còn đè lên cần điều khiển. Nút đánh và lăn rộng hơn.

### Đã đo, và chưa đo

- `npm test`: 152/152, Node v22.22.3.
- `node scripts/perf.mjs --check`: đạt ngân sách. Mô phỏng mean 0,134 ms, p95 0,302 ms, worst* 4,173
  ms (ngân sách p95 < 2,5 ms, worst* < 8 ms). World query p95 0,261 ms. Một lần chạy, không phải
  FPS trình duyệt. Phần vẽ chưa được đo.
- `node scripts/balance.mjs --write`, 5 seed, tối đa 20 phút trong game: bot có chuẩn bị 4/5 sống
  tới ngày 2 (1/5 chết vì bị săn lúc 2:07, khi đang xa nhà). Bot không hái lượm 5/5 chết, trung vị
  9:09, trong đó 1 bị săn và 4 vì lạnh. Đêm vẫn kết thúc một chuyến đi không chuẩn bị.
- `npm run test:e2e` không chạy: môi trường này không có Chromium. CI trên GitHub cũng chưa được
  chạy lại từ nhánh này.

## 5.0.0 — 21/09/2026

Bản **Khu rừng đáng đi xa**: vùng sinh thái, địa danh, hái lượm mở rộng và một ngày dài 24 phút.

### Thế giới

- Thuật toán sinh thế giới lên phiên bản 2 cho hành trình mới: 6 vùng sinh thái (đồng cỏ, rừng,
  rừng sâu, rừng sương, vùng đá, rừng cổ thụ) với tài nguyên và cảnh quan riêng, quyết định bằng
  nhiễu giá trị theo seed — cùng seed cho cùng một khu rừng, không phụ thuộc thứ tự ghé thăm.
- 6 loại địa danh (vòng đá, trại cũ, miếu rừng, ao, tảng đá khổng lồ, cây cổ thụ), mỗi seed có ít
  nhất một địa danh trong tầm đi bộ ngắn; đến gần sẽ khám phá và nhận quà (tinh thể, cao dán,
  nguyên liệu). Không thể dựng công trình chồng lên địa danh.
- Hành trình cũ giữ nguyên thuật toán v1: cây cối, tài nguyên và vị trí không xê dịch một điểm ảnh.
- Một ngày trong game dài đúng 24 phút (1440 giây mô phỏng), với bình minh, hoàng hôn, nửa đêm và
  đồng hồ hiển thị theo pha. Đêm vẫn nguy hiểm theo cách cũ: chỉ tối hơn và đẹp hơn.
- Thời tiết theo seed (quang, mây, sương, mưa), có tiếng mưa, hạt mưa và sương mù khi bật hiệu ứng.

### Hái lượm và chế tạo

- Tài nguyên mới: **nấm rừng** (ăn +15 no +2 máu, hoặc làm thuốc), **thảo mộc** (kèm 1 sợi khi hái),
  **tinh thể** (gỡ bằng cuốc, hồi sau 5 phút). Gần nhà luôn có sẵn một cụm nấm và một cụm thảo mộc.
- Công thức mới: **cao dán thảo mộc** (2 nấm + 1 thảo mộc, dùng bằng phím `G`, +35 máu) và **đèn
  lồng** (4 gỗ + 2 sợi + 1 tinh thể, đặt bằng phím `8`, soi sáng vùng rộng).
- Nhật ký mở rộng thành 11 bước: thêm hái lượm mới, chế cao dán/đèn lồng, khám phá địa danh và sống
  qua một ngày 24 phút.

### Hình ảnh và âm thanh

- Mọi hình ảnh mới đều vẽ bằng mã (Canvas 2D), không thêm tệp ảnh hay âm thanh nào: nấm, thảo mộc,
  tinh thể phát sáng, lửa trại, đèn lồng, cây cổ thụ và cả 6 địa danh.
- Nhạc hiệu khám phá, tiếng bước chân theo mặt đất, tiếng mưa, tiếng lửa lách tách gần trại, tiếng
  côn trùng ban đêm và âm tinh thể khi gỡ.
- Camera bám mượt có nhìn trước hướng đi, rung nhẹ khi dựng công trình hoặc khám phá (tắt được trong
  Cài đặt, và tự tắt khi bật giảm chuyển động). Cài đặt thêm chất lượng hình ảnh (tự động/nhẹ/chuẩn/
  đẹp) để máy yếu vẫn chơi mượt.

### Bản lưu

- Cấu trúc bản lưu lên phiên bản 3. Hành trình 2.0/3.0 (schema 1) và 4.0 (schema 2) được chuyển đổi
  từng bước khi đọc, giữ nguyên thế giới v1; chỉ hành trình mới dùng thế giới v2.
- Tên khóa `localStorage` giữ nguyên `domeo.journey.v1` để không mất bản lưu nào.

### Kiểm thử

- Số kiểm thử logic: 71 → **89** (vùng sinh thái, địa danh, thời tiết, cao dán, đèn lồng, đêm, mục
  tiêu mới, chuyển đổi bản lưu 4.0).
- Kịch bản trình duyệt: 22 → **24** (hái nấm/chế cao dán/dựng đèn lồng, khám phá địa danh).
- `npm run balance` mô phỏng thêm mốc hái lượm, chế cao dán và khám phá; xem `docs/BALANCE.md`.

## 4.0.1 — 21/09/2026

Bản sửa nhanh cho 4.0: **trò chơi đơ ngay khi bắt đầu hành trình**.

### Đã sửa

- **Đơ nhân vật:** `UI.render()` gọi `renderWayfinding()` và `renderInventory()` gọi `renderChest()`,
  hai hàm chưa từng được viết. Lỗi ném ra từ vòng lặp vẽ nên `requestAnimationFrame` không bao giờ
  được đặt lại — khung hình đứng yên và nhân vật không nhúc nhích. Hai hàm nay đã có: la bàn chỉ
  hướng cùng khoảng cách tới nhà, bản đồ nhỏ vẽ những chunk đã đi qua.
- **Chuyển đồ với rương:** các nút trong rương gọi một biến không tồn tại nên mọi cú nhấp đều lỗi.
  Cất và lấy đồ nay đi qua hàm `transfer` được truyền vào `UI`, đúng như phần còn lại của giao diện.
- Tab **Rương** chỉ hiện khi có rương đang mở; điều hướng bằng phím mũi tên bỏ qua tab đang ẩn.
- **Thanh đồ tràn ra ngoài màn hình 320 px:** bản 4.0 thêm ô thứ bảy (Rương) nên dãy ô
  vượt khỏi mép phải. Trên màn hình hẹp, các ô nay chia đều bề ngang còn lại thay vì giữ
  nguyên kích thước, và thẻ la bàn/bản đồ nhỏ tự xuống dòng. Kịch bản trình duyệt kiểm tra
  bố cục dọc và ngang đã bắt được lỗi này.

### Kiểm thử

- Thêm kiểm thử tĩnh: mọi `this.<tên>()` trong `src/ui.js` phải tồn tại, và một lượt kiểm tra tương
  tự cho các module còn lại — bộ kiểm thử logic sẽ báo ngay nếu lại thiếu một hàm như hai hàm trên.
- Thêm hai kịch bản trình duyệt: mở rương, cất rồi lấy lại đồ và đi tiếp mà thế giới vẫn chạy; và
  la bàn cùng bản đồ nhỏ bám theo nhà đã đánh dấu.
- `tests/upgrade.test.js` được định dạng lại. `format:check` đã chặn CI ngay từ bước đầu ở lần chạy
  4.0, nên `npm test` và toàn bộ kịch bản trình duyệt bị bỏ qua — đó là lý do lỗi này lọt ra ngoài.

Số kiểm thử logic: 69 → **71**; kịch bản trình duyệt: 20 → **22**.

## 4.0.0 — 21/09/2026

Bản **Một nơi để trở về**: vòng chơi có căn cứ thật, la bàn, và bản lưu được nâng cấp an toàn.

### Bản lưu

- Cấu trúc bản lưu lên phiên bản 2. Hành trình 2.0/3.0 (schema 1) được **chuyển đổi** khi đọc,
  không mất vị trí, túi đồ hay công trình; thuật toán sinh thế giới vẫn là phiên bản 1.
- **Xuất / nhập** tệp JSON từ màn hình tạm dừng. Tệp hỏng hoặc quá lớn không ghi đè bản đang chơi.
- Khóa tab: tab khác mở cùng hành trình sẽ không âm thầm ghi đè tiến trình mới hơn.

### Căn cứ

- **Rương gỗ** (6 gỗ + 2 sợi): đặt xuống, đứng gần nhấn E, cất hoặc lấy từng món.
- **Nướng quả** bên lửa trại (E khi còn quả mọng): quả nướng hồi 40 no và 12 máu.
- **Đánh dấu nhà** gần lửa (E khi hết quả, hoặc phím H). La bàn trên HUD chỉ hướng về nhà.
- Bản đồ nhỏ ghi các chunk đã khám phá, không lưu nguyên thế giới.

### Mục tiêu

- Nhật ký mở rộng thành 8 bước, kết thúc bằng một nơi để trở về rồi sống qua một chu kỳ.

### Tương thích

- Sprite, seed và tài nguyên thế giới không đổi so với 3.0. Chỉ thêm dữ liệu mới trên bản lưu v2.

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

- Bộ kiểm thử logic: 42 → **67** kiểm thử, gồm cài đặt, hợp đồng giữa HTML/mã/icon, chỉ mục công
  trình và khả năng nạp bản lưu 2.0.
- Bộ kiểm thử trình duyệt: 14 → **20** kịch bản, gồm cài đặt, phản hồi bị từ chối, bảng thông số và
  bố cục điện thoại. Lần chạy CI đầu tiên của bản này đã phát hiện hai lỗi thật (trường cache che
  phương thức trong `renderer.js`, và thang 0–100 so với 0–1 của thanh trượt âm lượng); cả hai đã
  được sửa trước khi phát hành.
- Thêm `README.md` cập nhật, `docs/PERFORMANCE.md`, `docs/BALANCE.md`, `docs/RELEASE-3.0.md`.

### Còn thiếu so với lộ trình

- Chưa có xuất/nhập bản lưu, sao lưu định kỳ hay phát hiện hai tab (v2.1).
- Chưa có rương, bàn chế tạo, tường/cửa hay nấu ăn (v2.2).
- Chưa có vùng sinh thái, bản đồ, địa điểm (v2.3); chưa có nhiệm vụ/nhật ký (v2.4); chưa có chiến
  đấu (v2.5).
- Chưa hỗ trợ PWA/ngoại tuyến; lý do và cách làm an toàn được ghi trong `docs/RELEASE-3.0.md`.
