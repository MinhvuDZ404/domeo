# Cân bằng Domeo 5.1

Tài liệu này ghi lại cách đo nhịp chơi và những con số đo được, để lần sau chỉnh cân bằng có
căn cứ thay vì cảm tính. Số liệu do `scripts/balance.mjs` sinh ra từ **chính logic game thật**
(`src/game.js`, `src/world.js`, `src/config.js`), chạy trong Node, không cần trình duyệt.

## Cách đo

- Một "bot" đi theo cùng luật như người chơi: nó đi tới tài nguyên gần nhất, hái lượm, chế tạo
  theo thứ tự rìu → cuốc → lửa trại → cao dán, ăn khi độ no dưới 50, dựng lửa trại khi đã chế tạo
  xong, rồi đi bộ tới địa danh gần nhất để khám phá. Bot không có bản đồ, nên khi kẹt vật cản nó
  đi vòng — những lần kẹt cũng được đếm.
- Mỗi bước thời gian là 0,05 giây, đúng bằng nhịp cập nhật của game (20 bước/giây).
- Kịch bản B mô phỏng người chơi chỉ đi dạo và ăn 3 quả ban đầu, để biết một phiên thư giãn có
  bao nhiêu khoảng lùi trước khi kiệt sức. Từ 5.0, bot đi dạo có thể nhặt quà khi tình cờ đi ngang
  địa danh — đúng như người chơi thật.
- Kết quả dưới đây là **thời gian trong game**, không phải thời gian ngồi trước màn hình. Người
  chơi thật còn phải đọc hướng dẫn và quan sát khu rừng, nên sẽ lâu hơn.

<!-- BEGIN:BALANCE-RESULTS -->

- **Cấu hình đo:** 5 hành trình mô phỏng, mỗi hành trình tối đa 20 phút trong game, bước thời gian 0,05 giây.
- **Cách chạy lại:** `npm run balance` (thêm `-- --seeds 10` để đo nhiều seed hơn).

| Mốc                                 | Số lần đạt | Trung vị | Nhanh nhất | Chậm nhất |
| ----------------------------------- | ---------- | -------- | ---------- | --------- |
| Hái quả đầu tiên                    | 5/5        | 1:17     | 0:03       | 1:28      |
| Chế tạo rìu                         | 5/5        | 0:01     | 0:01       | 0:02      |
| Chế tạo cuốc                        | 5/5        | 0:08     | 0:04       | 0:16      |
| Chế tạo lửa trại                    | 5/5        | 0:20     | 0:11       | 0:23      |
| Dựng lửa trại                       | 5/5        | 0:20     | 0:11       | 0:23      |
| Hái nấm/thảo dược/tinh thể đầu tiên | 5/5        | 0:15     | 0:09       | 0:28      |
| Chế tạo cao thảo dược               | 5/5        | 0:34     | 0:24       | 1:22      |
| Khám phá địa danh đầu tiên          | 5/5        | 2:01     | 0:34       | 7:32      |
| Đêm đầu tiên buông xuống            | 5/5        | 7:12     | 7:12       | 7:12      |
| Sang ngày thứ hai                   | 5/5        | 19:12    | 19:12      | 19:12     |

| Kết quả cuối mỗi hành trình     | Trung vị  | Nhỏ nhất | Lớn nhất  |
| ------------------------------- | --------- | -------- | --------- |
| Thời gian chơi mô phỏng         | 19:12     | 19:12    | 19:12     |
| Quãng đường                     | 173326 px | 93125 px | 179822 px |
| Sức khỏe còn lại                | 100       | 100      | 100       |
| Độ no còn lại                   | 73        | 73       | 73        |
| Số lần kẹt vật cản              | 25        | 11       | 28        |
| Địa danh đã khám phá            | 4         | 3        | 8         |
| Hành trình kết thúc vì kiệt sức | 0/5       |          |           |

### Kịch bản B — người chơi không hái lượm

Không thu thập gì thêm, chỉ đi dạo và ăn 3 quả ban đầu (có thể nhặt quà từ địa danh nếu tình cờ đi ngang):

| Kết quả                   | Trung vị | Nhỏ nhất | Lớn nhất |
| ------------------------- | -------- | -------- | -------- |
| Thời điểm kiệt sức        | 29:59    | 29:59    | 29:59    |
| Số hành trình kiệt sức    | 0/5      |          |          |
| Quả đã ăn                 | 6        | 6        | 6        |
| Địa danh tình cờ đi ngang | 9        | 7        | 10       |

Số liệu này dùng chung hằng số với game thật (`src/config.js`), nên khi chỉnh cân bằng hãy chạy lại báo cáo này.

## Hằng số đang dùng

| Nội dung                | Giá trị                                     |
| ----------------------- | ------------------------------------------- |
| Độ no giảm              | 0.11/giây                                   |
| Đói kiệt gây sát thương | 3/giây                                      |
| Quả mọng hồi            | +25 no                                      |
| Chu kỳ ngày             | 1440 giây                                   |
| Lửa trại hồi máu        | 2,5 máu/giây khi đứng gần và đủ no          |
| Rìu đá                  | 4 gỗ + 2 đá                                 |
| Lửa trại                | 6 gỗ + 4 đá                                 |
| Cây cho                 | 3 nhát → 5 gỗ                               |
| Bụi quả hồi sau         | 18 giây                                     |
| Nấm cho                 | 1 nấm ăn được (+15 no, +2 máu) hoặc làm cao |
| Thảo dược cho           | 1 thảo dược + 1 sợi                         |
| Tinh thể hồi sau        | 300 giây                                    |
| Cao thảo dược           | 2 nấm + 1 thảo dược → +35 máu               |
| Đèn lồng                | 4 gỗ + 2 sợi + 1 tinh thể                   |

<!-- END:BALANCE-RESULTS -->

## Đọc kết quả thế nào

- **Chuỗi mục tiêu mở đầu rất ngắn** khi người chơi đi thẳng tới tài nguyên: vùng xuất phát được
  bảo đảm có bụi quả, cành khô và đá cuội gần đó. Đây là chủ ý của bản 2.0 và vẫn được giữ: người
  mới không phải đi lang thang để có cây rìu đầu tiên.
- **Vòng hái lượm mới vào nhịp ngay**: nấm và thảo mộc có sẵn gần nhà nên bot hái món đầu tiên ở
  khoảng nửa phút và chế xong cao dán trước phút đầu. Tinh thể hiếm hơn đúng như thiết kế (vùng đá,
  rừng sâu, rừng cổ thụ), dành cho người chơi đã đi xa.
- **Khám phá được trả công**: bot đi thẳng tới địa danh gần nhất mất trung vị khoảng 2–3 phút; mỗi
  seed đều có ít nhất một địa danh trong tầm đi bộ ngắn (kiểm thử logic khóa điều này cho 50 seed).
- **Đi dạo cũng sống được**: bot kịch bản B không hái lượm gì nhưng tình cờ đi ngang 8–14 địa danh
  trong 30 phút và sống sót cả 5/5 nhờ quà khám phá. Đây là chủ ý — khám phá là cách chơi hợp lệ,
  và quà mỗi địa danh chỉ nhận một lần nên càng đi xa càng phải tự lo ăn.
- **Một ngày 24 phút cho nhịp thở dài**: đêm đầu buông xuống ở 7:12, ngày thứ hai sang ở 19:12.
  Người chơi có cả một buổi tối trong game để chuẩn bị trước khi trời tối.
- **Số lần kẹt của bot tăng** (trung vị 25, do bot không có tìm đường và hay đâm vào ao/tảng đá khi
  đi thẳng tới địa danh). Người chơi thật nhìn thấy đường nên con số này chỉ để tham khảo, không
  phải lỗi va chạm.

## Khi cần chỉnh cân bằng

1. Sửa hằng số ở `src/config.js` (nhóm "Survival tuning"), không sửa rải rác trong `src/game.js`.
2. Chạy `npm run balance` và so với bảng ở trên.
3. Chạy `npm test` — các kiểm thử logic đang khẳng định những giá trị cụ thể như tốc độ hồi máu
   cạnh lửa trại và lượng no của một quả mọng, nên đổi hằng số thì phải cập nhật kỳ vọng kèm giải
   thích.
4. Cập nhật lại tài liệu này bằng `npm run balance -- --write`.

## Kịch bản 5.1 cần đọc cùng số liệu trên

- **Newcomer:** khu vực gần nhà không spawn enemy; combat chỉ bắt đầu sau khi có lửa/nhà và đi khỏi safe radius.
- **Explorer / Survivor:** có thể chạy khỏi enemy; enemy despawn ngoài vùng mô phỏng và quest không yêu cầu farm số lượng lớn.
- **Fighter:** Stalker 34 HP, Guardian 72 HP, Wisp 24 HP; rìu gây 15 và lưỡi tinh luyện gây 24 damage. Mọi đòn enemy có wind-up 0,45–1,05 giây và player có i-frame 0,8 giây.
- **Builder:** trại cấp 2 cần 10 gỗ, 6 đá, 3 sợi; cấp 3 cần 16 gỗ, 10 đá, 3 tinh thể và 3 mảnh hộ vệ.
- **Night traveler:** mật độ candidate tăng từ 18% lên 34%, có Wisp nhanh nhưng mỏng; camp safe radius không đổi theo thời gian.
- **Long expedition:** hunger vẫn dùng đồng hồ 24 phút hiện hữu; combat không tạo drain nền mới.

Các con số combat hiện có unit test và bounded simulation, nhưng chưa có bot 5.1 tự chơi trọn chuỗi hải đăng. Cần manual playtest trước release để tinh chỉnh spawn/healing; không suy diễn bảng bot 5.0 thành bằng chứng endgame đã cân bằng hoàn hảo.
