# Cân bằng Domeo 3.0

Tài liệu này ghi lại cách đo nhịp chơi và những con số đo được, để lần sau chỉnh cân bằng có
căn cứ thay vì cảm tính. Số liệu do `scripts/balance.mjs` sinh ra từ **chính logic game thật**
(`src/game.js`, `src/world.js`, `src/config.js`), chạy trong Node, không cần trình duyệt.

## Cách đo

- Một "bot" đi theo cùng luật như người chơi: nó đi tới tài nguyên gần nhất, hái lượm, chế tạo
  theo thứ tự rìu → cuốc → lửa trại, ăn khi độ no dưới 50, và dựng lửa trại khi đã chế tạo xong.
  Bot không có bản đồ, nên khi kẹt vật cản nó đi vòng — những lần kẹt cũng được đếm.
- Mỗi bước thời gian là 0,05 giây, đúng bằng nhịp cập nhật của game (20 bước/giây).
- Kịch bản B mô phỏng người chơi chỉ đi dạo và ăn 3 quả ban đầu, để biết một phiên thư giãn có
  bao nhiêu khoảng lùi trước khi kiệt sức.
- Kết quả dưới đây là **thời gian trong game**, không phải thời gian ngồi trước màn hình. Người
  chơi thật còn phải đọc hướng dẫn và quan sát khu rừng, nên sẽ lâu hơn.

<!-- BEGIN:BALANCE-RESULTS -->

- **Cấu hình đo:** 5 hành trình mô phỏng, mỗi hành trình tối đa 20 phút trong game, bước thời gian 0,05 giây.
- **Cách chạy lại:** `npm run balance` (thêm `-- --seeds 10` để đo nhiều seed hơn).

| Mốc               | Số lần đạt | Trung vị | Nhanh nhất | Chậm nhất |
| ----------------- | ---------- | -------- | ---------- | --------- |
| Hái quả đầu tiên  | 5/5        | 0:46     | 0:07       | 1:48      |
| Chế tạo rìu       | 5/5        | 0:01     | 0:01       | 0:02      |
| Chế tạo cuốc      | 5/5        | 0:08     | 0:06       | 0:20      |
| Chế tạo lửa trại  | 5/5        | 0:13     | 0:10       | 0:29      |
| Dựng lửa trại     | 5/5        | 0:13     | 0:10       | 0:29      |
| Qua nửa đêm đầu   | 5/5        | 1:00     | 1:00       | 1:00      |
| Sang ngày thứ hai | 5/5        | 2:00     | 2:00       | 2:00      |

| Kết quả cuối mỗi hành trình     | Trung vị | Nhỏ nhất | Lớn nhất |
| ------------------------------- | -------- | -------- | -------- |
| Thời gian chơi mô phỏng         | 2:00     | 2:00     | 2:00     |
| Quãng đường                     | 17760 px | 17130 px | 18451 px |
| Sức khỏe còn lại                | 100      | 100      | 100      |
| Độ no còn lại                   | 74       | 74       | 74       |
| Số lần kẹt vật cản              | 4        | 2        | 5        |
| Hành trình kết thúc vì kiệt sức | 0/5      |          |          |

### Kịch bản B — người chơi không hái lượm

Không thu thập gì thêm, chỉ đi dạo và ăn 3 quả ban đầu:

| Kết quả                | Trung vị | Nhỏ nhất | Lớn nhất |
| ---------------------- | -------- | -------- | -------- |
| Thời điểm kiệt sức     | 13:48    | 13:48    | 13:48    |
| Số hành trình kiệt sức | 5/5      |          |          |
| Quả đã ăn              | 3        | 3        | 3        |

Số liệu này dùng chung hằng số với game thật (`src/config.js`), nên khi chỉnh cân bằng hãy chạy lại báo cáo này.

## Hằng số đang dùng

| Nội dung                | Giá trị                            |
| ----------------------- | ---------------------------------- |
| Độ no giảm              | 0.22/giây                          |
| Đói kiệt gây sát thương | 3/giây                             |
| Quả mọng hồi            | +25 no                             |
| Chu kỳ ngày             | 120 giây                           |
| Lửa trại hồi máu        | 2,5 máu/giây khi đứng gần và đủ no |
| Rìu đá                  | 4 gỗ + 2 đá                        |
| Lửa trại                | 6 gỗ + 4 đá                        |
| Cây cho                 | 3 nhát → 5 gỗ                      |
| Bụi quả hồi sau         | 18 giây                            |

<!-- END:BALANCE-RESULTS -->

## Đọc kết quả thế nào

- **Chuỗi mục tiêu mở đầu rất ngắn** khi người chơi đi thẳng tới tài nguyên: vùng xuất phát được
  bảo đảm có bụi quả, cành khô và đá cuội gần đó. Đây là chủ ý của bản 2.0 và vẫn được giữ: người
  mới không phải đi lang thang để có cây rìu đầu tiên.
- **Khoảng lùi sinh tồn khá rộng**: nếu chỉ đi dạo và ăn hết 3 quả ban đầu, người chơi mất khoảng
  13–14 phút mới kiệt sức, trong khi bụi quả mọc lại chỉ sau 18 giây. Nghĩa là chết vì đói gần như
  luôn là do chủ động bỏ qua việc ăn, không phải do bản cân bằng quá khắt khe.
- **Không có thay đổi hằng số nào được thực hiện cho bản 3.0.** Báo cáo này cho thấy nhịp hiện tại
  đã nằm trong khoảng mong muốn, nên bản 3.0 chỉ ghi lại số đo và giữ nguyên luật chơi.

## Khi cần chỉnh cân bằng

1. Sửa hằng số ở `src/config.js` (nhóm "Survival tuning"), không sửa rải rác trong `src/game.js`.
2. Chạy `npm run balance` và so với bảng ở trên.
3. Chạy `npm test` — các kiểm thử logic đang khẳng định những giá trị cụ thể như tốc độ hồi máu
   cạnh lửa trại và lượng no của một quả mọng, nên đổi hằng số thì phải cập nhật kỳ vọng kèm giải
   thích.
4. Cập nhật lại tài liệu này bằng `npm run balance -- --write`.
