# Cân bằng Domeo 5.1

Tài liệu này ghi lại cách đo nhịp chơi và những con số đo được, để lần sau chỉnh cân bằng có
căn cứ thay vì cảm tính. Số liệu do `scripts/balance.mjs` sinh ra từ **chính logic game thật**
(`src/game.js`, `src/world.js`, `src/config.js`), chạy trong Node, không cần trình duyệt.

## Cách đo

- Một "bot" đi theo cùng luật như người chơi: nó đi tới tài nguyên gần nhất, hái lượm, chế tạo
  theo thứ tự rìu → cuốc → lửa trại → cao dán → đuốc, ăn món ngon nhất đang mang, dựng lửa trại khi
  đã chế tạo xong, rồi đi bộ tới địa danh gần nhất để khám phá. Bot không có bản đồ, nên khi kẹt
  vật cản nó đi vòng — những lần kẹt cũng được đếm.
- **Từ 5.1, bot còn chơi theo vòng lặp của bản 5.1:** đánh trả khi bị sinh vật săn, dùng cao dán khi
  máu xuống thấp, thắp đuốc khi trời tối, và **về nhà qua đêm** khi đã có lửa trại. Nhờ vậy bảng số
  đo được "một người chơi biết chuẩn bị" khác gì "một người đi lang thang lúc nửa đêm" — chứ không
  chỉ đo xem bot có may mắn không.
- Kết quả cuối mỗi hành trình có thêm **nguyên nhân kết thúc**: bị săn, vì đói, vì lạnh. Ba nguyên
  nhân này cần cách xử lý khác nhau, nên gộp chung vào một chữ "kiệt sức" là mất thông tin.
- Mỗi bước thời gian là 0,05 giây, đúng bằng nhịp cập nhật của game (20 bước/giây).
- Kịch bản B mô phỏng người chơi chỉ đi dạo và ăn 3 quả ban đầu, để biết một phiên thư giãn có
  bao nhiêu khoảng lùi trước khi kiệt sức. Từ 5.0, bot đi dạo có thể nhặt quà khi tình cờ đi ngang
  địa danh — đúng như người chơi thật.
- Kết quả dưới đây là **thời gian trong game**, không phải thời gian ngồi trước màn hình. Người
  chơi thật còn phải đọc hướng dẫn và quan sát khu rừng, nên sẽ lâu hơn.

<!-- BEGIN:BALANCE-RESULTS -->

- **Cấu hình đo:** 5 hành trình mô phỏng, mỗi hành trình tối đa 20 phút trong game, bước thời gian 0,05 giây.
- **Bot 5.1:** bot chế tạo rìu → cuốc → lửa trại → cao dán → đuốc, ăn món ngon nhất đang có, đánh trả khi bị săn, và **về nhà qua đêm** khi đã có lửa trại. Bot vẫn không có bản đồ và không biết tìm đường.
- **Cách chạy lại:** `npm run balance` (thêm `-- --seeds 10` để đo nhiều seed hơn).

| Mốc                                 | Số lần đạt | Trung vị | Nhanh nhất | Chậm nhất |
| ----------------------------------- | ---------- | -------- | ---------- | --------- |
| Hái quả đầu tiên                    | 5/5        | 1:17     | 0:03       | 2:31      |
| Chế tạo rìu                         | 5/5        | 0:01     | 0:01       | 0:02      |
| Chế tạo cuốc                        | 5/5        | 0:08     | 0:04       | 0:16      |
| Chế tạo lửa trại                    | 5/5        | 0:20     | 0:11       | 0:23      |
| Dựng lửa trại                       | 5/5        | 0:20     | 0:11       | 0:23      |
| Hái nấm/thảo dược/tinh thể đầu tiên | 5/5        | 0:15     | 0:09       | 0:28      |
| Chế tạo cao thảo dược               | 5/5        | 0:34     | 0:24       | 1:22      |
| Khám phá địa danh đầu tiên          | 4/5        | 2:47     | 0:34       | 5:02      |
| Đêm đầu tiên buông xuống            | 5/5        | 7:12     | 7:12       | 7:12      |
| Sang ngày thứ hai                   | 5/5        | 19:12    | 19:12      | 19:12     |

| Kết quả cuối mỗi hành trình          | Trung vị  | Nhỏ nhất | Lớn nhất |
| ------------------------------------ | --------- | -------- | -------- |
| Thời gian chơi mô phỏng              | 19:12     | 19:12    | 19:12    |
| Quãng đường                          | 50800 px  | 18096 px | 61029 px |
| Sức khỏe còn lại                     | 100       | 97       | 100      |
| Độ no còn lại                        | 68        | 68       | 73       |
| Số lần kẹt vật cản                   | 4         | 2        | 18       |
| Địa danh đã khám phá                 | 2         | 0        | 4        |
| Sinh vật đã hạ gục                   | 6         | 1        | 8        |
| Hơi ấm còn lại                       | 100       | 100      | 100      |
| Cao dán đã dùng                      | 3         | 0        | 4        |
| Hành trình kết thúc vì kiệt sức      | 0/5       |          |          |
| … trong đó bị săn / vì đói / vì lạnh | 0 / 0 / 0 |          |          |

### Kịch bản B — người chơi không hái lượm

Không thu thập gì thêm, chỉ đi dạo và ăn 3 quả ban đầu (có thể nhặt quà từ địa danh nếu tình cờ đi ngang):

| Kết quả                              | Trung vị  | Nhỏ nhất | Lớn nhất |
| ------------------------------------ | --------- | -------- | -------- |
| Thời điểm kiệt sức                   | 8:16      | 6:21     | 8:46     |
| Số hành trình kiệt sức               | 5/5       |          |          |
| Quả đã ăn                            | 1         | 0        | 1        |
| Địa danh tình cờ đi ngang            | 1         | 1        | 3        |
| … trong đó bị săn / vì đói / vì lạnh | 5 / 0 / 0 |          |          |

Số liệu này dùng chung hằng số với game thật (`src/config.js`), nên khi chỉnh cân bằng hãy chạy lại báo cáo này.

## Hằng số đang dùng

| Nội dung                           | Giá trị                                                  |
| ---------------------------------- | -------------------------------------------------------- |
| Độ no giảm                         | 0.11/giây                                                |
| Đói kiệt gây sát thương            | 3/giây                                                   |
| Quả mọng hồi                       | +25 no                                                   |
| Chu kỳ ngày                        | 1440 giây                                                |
| Lửa trại hồi máu                   | 2,5 máu/giây khi đứng gần và đủ no                       |
| Rìu đá                             | 4 gỗ + 2 đá                                              |
| Lửa trại                           | 6 gỗ + 4 đá                                              |
| Cây cho                            | 3 nhát → 5 gỗ                                            |
| Bụi quả hồi sau                    | 18 giây                                                  |
| Nấm cho                            | 1 nấm ăn được (+15 no, +2 máu) hoặc làm cao              |
| Thảo dược cho                      | 1 thảo dược + 1 sợi                                      |
| Tinh thể hồi sau                   | 300 giây                                                 |
| Cao thảo dược                      | 2 nấm + 1 thảo dược → +35 máu                            |
| Đèn lồng                           | 4 gỗ + 2 sợi + 1 tinh thể                                |
| Đuốc                               | 3 gỗ + 2 sợi                                             |
| Hơi ấm tụt ban đêm                 | 0.32/giây                                                |
| Hơi ấm tụt khi mưa                 | 0.24/giây                                                |
| Hơi ấm hồi cạnh lửa trại           | 9/giây                                                   |
| Hơi ấm hồi trong lều               | 4/giây                                                   |
| Hơi ấm hồi khi cầm đuốc            | 1.6/giây                                                 |
| Lạnh gây sát thương dưới           | 20 hơi ấm, tối đa 1.1 máu/giây                           |
| Thanh sức bền hồi                  | 14/giây                                                  |
| Chạy nhanh tốn                     | 13/giây (×1.4 tốc độ)                                    |
| Lăn né tốn                         | 24 sức bền, bất tử 0.42 giây                             |
| Vung vũ khí tốn                    | 6 sức bền                                                |
| Sinh vật tối đa                    | 10 con cùng lúc, tối đa 10 × 1.6 khoảng ngủ thì biến mất |
| Thời gian bất tử sau khi trúng đòn | 0.85 giây                                                |

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
- **Ban đêm là áp lực thật, không phải phông nền**: bot kịch bản B (không hái lượm, không đánh trả,
  không có lửa) chết cả 5/5 hành trình, trung vị 8:16 — tức khoảng một phút sau khi trời tối ở 7:12,
  và **cả 5 cái chết đều vì bị săn**, không phải vì đói hay lạnh. Đây là chủ ý của 5.1: bóng tối có
  sinh vật của nó, và người đi đêm mà không chuẩn bị sẽ phải trả giá.
- **Ngược lại, người biết chuẩn bị sống khỏe**: cùng 5 seed đó, bot kịch bản A về nhà qua đêm và
  sống 5/5, kết thúc ngày thứ hai với 97–100 máu, 68–73 độ no, hơi ấm đầy. Hạ gục trung vị 6 sinh
  vật trong lúc bị săn. Vòng lặp 5.1 hoạt động: lửa trại là nhà, nhà là chỗ sống qua đêm.
- **Khám phá bị đêm chia lại**: bot chỉ còn khám phá 2–4 địa danh mỗi hành trình (trước đây 3–8) vì
  nó dành phần lớn thời gian ban đêm ở nhà. Người chơi thật có thể chọn đi tiếp — và trả giá bằng
  nguy hiểm, đúng như thiết kế.
- **Một ngày 24 phút cho nhịp thở dài**: đêm đầu buông xuống ở 7:12, ngày thứ hai sang ở 19:12.
  Người chơi có cả một buổi tối trong game để chuẩn bị trước khi trời tối.
- **Số lần kẹt của bot giờ rất thấp** (trung vị 4) vì bot dừng lại có chủ đích ở nhà thay vì đâm
  vào vật cản; đứng yên chờ đêm không bị tính là "kẹt". Người chơi thật nhìn thấy đường nên con số
  này chỉ để tham khảo, không phải lỗi va chạm.

## Khi cần chỉnh cân bằng

1. Sửa hằng số ở `src/config.js` (nhóm "Survival tuning", "Warmth" và "Stamina"), không sửa rải
   rác trong `src/game.js`. Hơi ấm và sức bền là hai áp lực mới của 5.1: chúng quyết định đêm có
   đáng sợ hay không, nên chỉnh chúng thì phải chạy lại cả hai kịch bản.
2. Chạy `npm run balance` và so với bảng ở trên.
3. Chạy `npm test` — các kiểm thử logic đang khẳng định những giá trị cụ thể như tốc độ hồi máu
   cạnh lửa trại, lượng no của một quả mọng, hơi ấm tụt trong đêm và ngưỡng hạ gục của sinh vật,
   nên đổi hằng số thì phải cập nhật kỳ vọng kèm giải thích.
4. Cập nhật lại tài liệu này bằng `npm run balance -- --write`.
