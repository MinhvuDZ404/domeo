# Kế hoạch nâng cấp Domeo

- **Ngày lập:** 19/09/2026
- **Nền tảng:** bản 2.0 hiện có trong workspace
- **Trạng thái:** đề xuất để triển khai từng đợt; tài liệu này không có nghĩa các tính năng bên dưới đã được làm hoặc phát hành.
- **Cập nhật 21/09/2026:** bản **4.0.0** đã làm một phần v2.1 (chuyển đổi bản lưu, xuất/nhập, khóa tab) và một phần v2.2 (rương, nấu ăn, đánh dấu nhà). Bản **4.0.1** sửa lỗi đơ khi bắt đầu hành trình, đồng thời hoàn thiện la bàn, bản đồ nhỏ và việc chuyển đồ với rương. Vùng sinh thái, nhiệm vụ dài và chiến đấu vẫn chờ.

## 0. Bản 3.0 đã làm gì so với lộ trình này

Bản 3.0 đi thẳng vào **giai đoạn 6 (v3.0 — hoàn thiện để phát hành)** cho vòng chơi hiện có, và
chưa làm v2.1–v2.5. Lý do: nhịp chơi 2.0 đã ổn định, nên việc cân bằng, hình ảnh, âm thanh, hiệu
năng và tài liệu kiểm thử mang lại giá trị ngay mà không phải mở thêm hệ thống mới.

| Mốc lộ trình                  | Trạng thái trong 3.0                                                                                                                                                                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v2.1 — Nền tảng an toàn       | **Chưa làm.** Vẫn chưa có chuyển đổi bản lưu nhiều bước, xuất/nhập JSON, sao lưu định kỳ hay phát hiện hai tab. Cấu trúc bản lưu vẫn là phiên bản 1 nên chưa có gì phải chuyển đổi.                                                                                                       |
| v2.2 — Một nơi để trở về      | **Chưa làm.** Chưa có rương, bàn chế tạo, tường/cửa, nấu ăn.                                                                                                                                                                                                                              |
| v2.3 — Khu rừng rộng hơn      | **Chưa làm.** Chưa có vùng sinh thái, bản đồ hay địa điểm.                                                                                                                                                                                                                                |
| v2.4 — Một hành trình có đích | **Chưa làm.** Mục tiêu khởi đầu vẫn là danh sách 5 bước, chưa thành hệ thống nhiệm vụ.                                                                                                                                                                                                    |
| v2.5 — Hiểm nguy trong rừng   | **Chưa làm** và vẫn là hạng mục tùy chọn.                                                                                                                                                                                                                                                 |
| v3.0 — Bản hoàn thiện         | **Đã làm một phần:** cài đặt trong game (âm lượng, âm thanh môi trường, giảm chuyển động, hiệu ứng), phản hồi khi hành động và khi bị từ chối, thang màu ngày–đêm, tối ưu vẽ và truy vấn, công cụ đo hiệu năng/cân bằng, 67 kiểm thử logic + 20 kịch bản trình duyệt, tài liệu phát hành. |

Còn **hai điều kiện của giai đoạn 6 chưa đạt**, và tài liệu này giữ nguyên chúng như việc phải làm:

1. **Thử trên điện thoại thật** (ít nhất một Android/Chrome và một iPhone/Safari). Bảng ghi kết quả
   còn trống trong `docs/RELEASE-3.0.md`.
2. **Đo FPS thật trong trình duyệt.** Đã có bảng thông số (`?debug=1`) để đo, nhưng số liệu thực tế
   chưa được ghi lại (`docs/PERFORMANCE.md`).

PWA/ngoại tuyến vẫn nằm ngoài bản này, có lý do trong `docs/RELEASE-3.0.md`. **Giữ nguyên khuyến
nghị:** đợt tiếp theo vẫn nên là v2.1, vì mọi thứ về sau (rương, vùng sinh thái, nhiệm vụ) đều làm
bản lưu phức tạp hơn.

## 1. Định hướng

Phát triển Domeo thành **game khám phá và sinh tồn trong rừng, có xây căn cứ, chế tạo và mục tiêu dài hạn**, nhưng giữ cảm giác nhẹ nhàng của phiên bản hiện tại.

Vòng chơi mục tiêu:

> Khám phá → thu thập → chế tạo → cải thiện căn cứ → chuẩn bị cho chuyến đi xa hơn → tìm thấy câu chuyện mới → trở về.

Ba nguyên tắc:

1. **Có lý do để đi tiếp:** vùng đất và vật phẩm mới phải mở ra một việc mới để làm, không chỉ thay màu cảnh vật.
2. **Có nơi để trở về:** căn cứ cần có công dụng như chứa đồ, nấu ăn và chế tạo, không chỉ để trang trí.
3. **Không đánh đổi tiến trình lấy tính năng:** bảo vệ bản lưu và khả năng chơi trên điện thoại trước khi tăng độ phức tạp.

**Giả định cho kế hoạch:** tiếp tục làm game chơi đơn trên trình duyệt, giữ JavaScript thuần + Canvas và khả năng triển khai tĩnh trên GitHub Pages. Chiến đấu là phần mở rộng tùy chọn, không bắt buộc để tận hưởng game.

## 2. Điểm xuất phát

### Đã có

- Thế giới sinh theo seed và chunk; camera, va chạm và vùng xuất phát an toàn.
- Máu, độ no, ngày–đêm, thu thập tài nguyên.
- 9 loại vật phẩm, 5 công thức; rìu, cuốc, đuốc, lửa trại và hàng rào.
- Menu, tạm dừng, chơi lại, túi đồ, hướng dẫn và mục tiêu khởi đầu.
- Lưu/tiếp tục bằng `localStorage`; điều khiển bàn phím và cảm ứng.
- Kiến trúc module, CI và bộ kiểm thử hiện có gồm 42 kiểm thử logic, 14 kiểm thử trình duyệt.
- Từ 3.0: cài đặt người chơi lưu riêng, âm thanh môi trường, phản hồi hành động, công cụ đo hiệu
  năng (`npm run perf`) và đo cân bằng (`npm run balance`), nâng lên 67 kiểm thử logic và 20 kịch
  bản trình duyệt.

### Khoảng trống chính

- Sau những mục tiêu đầu tiên, người chơi chưa có nhiều lý do để tiếp tục.
- Xây dựng còn ít chức năng; chưa có rương, bàn chế tạo hay căn cứ hoàn chỉnh.
- Thế giới chưa có nhiều vùng sinh thái và địa điểm đặc biệt.
- Chưa có quy trình nâng cấp định dạng bản lưu, xuất/nhập tiến trình hoặc quản lý phiên bản sinh thế giới.
- Chưa có chiến đấu; đây là lựa chọn thiết kế cần cân nhắc, không phải lỗi bắt buộc phải sửa.

**Ưu tiên quan trọng nhất:** làm an toàn việc nâng cấp bản lưu trước khi thêm nhiều vật phẩm hoặc đổi cách sinh bản đồ.

## 3. Lộ trình tổng quan

Tên phiên bản dưới đây là nhãn kế hoạch, chưa phải ngày phát hành đã cam kết.

| Mốc                               | Ưu tiên            | Trọng tâm                                              | Kết quả người chơi nhận được                                         |
| --------------------------------- | ------------------ | ------------------------------------------------------ | -------------------------------------------------------------------- |
| **v2.1 — Nền tảng an toàn**       | P0                 | Bản lưu, sao lưu, cài đặt, giao diện cảm ứng           | Yên tâm giữ hành trình qua các bản nâng cấp                          |
| **v2.2 — Một nơi để trở về**      | P1                 | Rương, bàn chế tạo, xây dựng, nấu ăn                   | Tạo được căn cứ nhỏ có công dụng thực tế                             |
| **v2.3 — Khu rừng rộng hơn**      | P1                 | Vùng sinh thái, bản đồ, địa điểm khám phá              | Có lý do rời căn cứ và biết đường trở lại                            |
| **v2.4 — Một hành trình có đích** | P1                 | Nhật ký, nhiệm vụ, mở khóa, mục tiêu cuối              | Có một tuyến trải nghiệm khoảng 30–60 phút để cân bằng và thử nghiệm |
| **v2.5 — Hiểm nguy trong rừng**   | P2, tùy chọn       | Vũ khí, kẻ địch, mức độ thử thách                      | Có chiến đấu nhưng vẫn giữ được lựa chọn chơi nhẹ nhàng              |
| **v3.0 — Bản hoàn thiện**         | P0 trước phát hành | Cân bằng, hình ảnh, âm thanh, hiệu năng, thiết bị thật | Một bản chơi ổn định và nhất quán hơn                                |

- **P0:** điều kiện an toàn/chất lượng không được bỏ qua.
- **P1:** nội dung chính để vòng chơi có chiều sâu.
- **P2:** mở rộng sau khi vòng chơi chính đã tốt.

**Thứ tự khuyến nghị:** v2.1 → v2.2 → v2.3 → v2.4 → cân nhắc v2.5 → v3.0. Có thể bỏ qua v2.5 nếu muốn giữ Domeo thiên về khám phá yên bình.

Không nên làm tất cả trong một lần sửa lớn. Mỗi mốc cần có bản chơi được, kiểm thử và phản hồi trước khi mở rộng tiếp.

## 4. Phạm vi từng giai đoạn

### Giai đoạn 1 — v2.1: bảo vệ tiến trình và cải thiện trải nghiệm cơ bản

**Làm gì**

- Bổ sung cơ chế chuyển đổi bản lưu cũ sang định dạng mới, thay vì chỉ từ chối phiên bản khác.
- Có bản sao lưu hợp lệ gần nhất và nút **Xuất tiến trình / Nhập tiến trình** bằng file JSON.
- Kiểm tra dữ liệu, dung lượng và xác nhận trước khi nhập hoặc thay thế bản lưu; lỗi nhập không được xóa bản đang chơi.
- Ghi nhận phiên bản thuật toán sinh thế giới, tách biệt với phiên bản game và phiên bản cấu trúc bản lưu.
- Phát hiện xung đột khi nhiều tab cùng dùng một bản lưu; không âm thầm ghi đè tiến trình mới hơn từ tab khác.
- Bổ sung cài đặt âm lượng, giảm hiệu ứng chuyển động và kích thước giao diện.
- Rà soát vùng chạm, màn hình nhỏ, tai thỏ và thanh điều hướng điện thoại. Với nút quan trọng, hướng tới vùng chạm 44 × 44 px; nếu thiếu chỗ, đổi bố cục thay vì thu nhỏ mọi nút.

**Tiêu chí hoàn thành**

- Nạp bản lưu của v2.0 → chơi → lưu → tải lại mà không mất vị trí, vật phẩm, công trình hoặc làm thay đổi thế giới cũ.
- Xuất rồi nhập lại cho kết quả tương đương; file hỏng, quá lớn hoặc sai phiên bản không làm sập game và không ghi đè dữ liệu tốt.
- Thử hai tab, bộ nhớ bị chặn/đầy và đóng trang trong lúc chơi; kết quả được thông báo rõ.
- Thao tác được trên màn hình rộng 320 px mà không có nút quan trọng nằm ngoài màn hình.

**Chưa làm:** tài khoản, cloud save hoặc đồng bộ nhiều thiết bị.

### Giai đoạn 2 — v2.2: xây một căn cứ có ích

**Làm gì**

- Thêm **rương chứa đồ** và giao diện chuyển vật phẩm giữa túi/rương bằng cả chuột, bàn phím và cảm ứng.
- Thêm **bàn chế tạo** cho công thức nâng cao; giữ các công thức khởi đầu hiện tại có thể làm bằng tay.
- Bổ sung sàn, tường gỗ và cửa; xem trước vùng chiếm chỗ, xoay cấu kiện phù hợp, đóng/mở cửa và tháo dỡ có kiểm soát.
- Tận dụng lửa trại để chế biến món ăn. Bắt đầu với ít công thức dùng tài nguyên sẵn có; chỉ mở rộng món khi có nguyên liệu mới.
- Cho phép đánh dấu một vị trí làm căn cứ để la bàn/bản đồ ở giai đoạn sau dẫn đường về.
- Cân bằng lượng tài nguyên: người chơi không phải chặt lặp đi lặp lại quá lâu chỉ để dựng căn cứ đầu tiên.

**Quy tắc chống mất/nhân đôi đồ**

- Chuyển đồ là một thao tác trọn vẹn: hoặc chuyển thành công, hoặc giữ nguyên cả hai bên.
- Không tháo rương còn đồ. Hiển thị phần nguyên liệu được hoàn lại trước khi tháo công trình.
- Không trừ vật phẩm khi vị trí đặt không hợp lệ; không hoàn nguyên liệu nhiều lần cho cùng công trình.
- Không đổi luật chết/hồi sinh trong mốc này mà không có quyết định thiết kế riêng.

**Tiêu chí hoàn thành**

- Người chơi dựng được căn cứ có rương, bàn chế tạo, cửa và lửa trại; rời đi rồi quay lại vẫn sử dụng bình thường.
- Đồ trong rương, hướng công trình và trạng thái cửa tồn tại đúng sau khi tải lại trang.
- Không đặt chồng vật thể, đi xuyên tường, bị nhốt bởi cửa hoặc để tài nguyên mọc xuyên công trình.

**Chưa làm:** nhà nhiều tầng, hệ thống điện, tự động hóa hoặc độ bền cho mọi vật phẩm.

### Giai đoạn 3 — v2.3: khám phá có phần thưởng

**Làm gì**

- Tạo ba vùng sinh thái đầu tiên: **rừng**, **đồng cỏ** và **bờ hồ**.
- Mỗi vùng có cách bố trí tài nguyên và cảnh quan riêng; thêm tối đa vài tài nguyên mới có công dụng rõ ràng, chẳng hạn nấm hoặc lau sậy.
- Thêm bản đồ vùng đã khám phá, điểm đánh dấu căn cứ và la bàn dẫn về nhà. Trên điện thoại, bản đồ có thể mở riêng để không che vùng chơi.
- Thêm các địa điểm như trại bỏ hoang, khu phế tích và bến hồ; có đồ tìm được hoặc thông tin phục vụ nhật ký.
- Xử lý bờ nước, vùng không thể đi qua và đường tiếp cận địa điểm quan trọng.
- Giữ thuật toán sinh thế giới cũ cho hành trình cũ. Thế giới dùng thuật toán mới được tạo khi bắt đầu hành trình mới, có giải thích và sao lưu rõ ràng.

**Tiêu chí hoàn thành**

- Cùng seed và cùng phiên bản sinh thế giới cho kết quả nhất quán, không phụ thuộc thứ tự ghé thăm các chunk.
- Không có đường nối sai ở ranh giới chunk; không sinh người chơi hoặc tài nguyên cần tiếp cận giữa vùng nước bị chặn.
- Bộ seed kiểm thử có đường đi từ điểm xuất phát tới các địa điểm mục tiêu.
- Thông tin khám phá vẫn còn sau khi tải lại; không phải lưu nguyên bản đồ để làm được điều đó.
- Bộ đệm chunk vẫn có giới hạn; chơi và đi xa không làm bộ nhớ tăng không kiểm soát.

**Chưa làm:** biển lớn, thuyền, hang động nhiều tầng hoặc hàng chục vùng sinh thái.

### Giai đoạn 4 — v2.4: tạo mục tiêu dài hạn

**Làm gì**

- Chuyển mục tiêu khởi đầu thành hệ thống nhiệm vụ có ID ổn định, điều kiện hoàn thành, phần thưởng và trạng thái đã nhận thưởng.
- Thiết kế khoảng **6–8 nhiệm vụ chính**, ví dụ:
  1. Chuẩn bị thức ăn và công cụ.
  2. Lập căn cứ đầu tiên.
  3. Khám phá một vùng sinh thái mới.
  4. Tìm dấu vết trong trại bỏ hoang.
  5. Thu thập ba bộ phận từ các địa điểm đặc biệt.
  6. Khôi phục một tháp tín hiệu trong rừng.
- Thêm nhật ký ngắn kể chuyện qua những gì người chơi tìm thấy, tránh đoạn thoại dài làm gián đoạn việc chơi.
- Dùng mở khóa công thức hoặc đồ trang trí làm phần thưởng thay vì chỉ tăng chỉ số vô hạn.
- Sau mục tiêu cuối, cho phép tiếp tục xây dựng và khám phá tự do.

**Tiêu chí hoàn thành**

- Có thể hoàn thành tuyến nhiệm vụ bằng khám phá/chế tạo, không bắt buộc chiến đấu.
- Không mất trạng thái nhiệm vụ sau khi đóng trang; không nhận thưởng lặp lại bằng tải lại bản lưu.
- Không rơi vào ngõ cụt vì thiếu địa điểm, vật phẩm nhiệm vụ bị tiêu nhầm hoặc không đủ chỗ nhận thưởng.
- Nội dung phụ thuộc thuật toán bản đồ mới phải được chỉ rõ; không giao nhiệm vụ không thể hoàn thành cho thế giới cũ.

**Mục tiêu thử nghiệm:** một lượt đi từ khởi đầu đến mốc truyện chính khoảng 30–60 phút. Đây là mục tiêu cân bằng để kiểm chứng bằng chơi thử, không phải thời lượng hiện đã có.

### Giai đoạn 5 — v2.5: chiến đấu tùy chọn

Chỉ triển khai sau khi xác nhận rằng phần nguy hiểm phù hợp với hướng đi của Domeo.

**Phạm vi ban đầu**

- Một vũ khí đơn giản, chẳng hạn giáo đá, với hoạt ảnh, tầm đánh và thời gian chờ rõ ràng.
- Hai loại kẻ địch có hành vi khác nhau: một loại chậm, dễ né; một loại cơ động hơn.
- AI cơ bản: đi lang thang → phát hiện người chơi → đuổi theo → tấn công → rút lui.
- Báo trước đòn đánh, khoảng miễn sát thương ngắn sau khi trúng đòn và giới hạn số quái hoạt động.
- Thêm nút đánh trên cảm ứng; không chiếm hoặc làm hỏng các thao tác hái lượm, đặt công trình và mở menu.
- Có lựa chọn **Thư giãn** và **Sinh tồn**. Bản lưu cũ không tự nhiên bị thêm quái sau một lần cập nhật.

**Quy tắc thiết kế**

- Có khoảng làm quen an toàn; không thả quái tấn công ngay khi người chơi mới đang đọc hướng dẫn.
- Không sinh quái trong công trình, sát người chơi hoặc đột ngột bên trong vùng an toàn.
- Quái không đi xuyên cây/tường; không tính AI cho cả thế giới.
- Bản chiến đấu đầu tiên không cho quái phá căn cứ của người chơi.
- Chốt chính sách chết/hồi sinh trước khi làm: giữ luật hiện tại hay thêm hồi sinh có phạt. Quy tắc được lưu theo hành trình và thông báo trước, không âm thầm thay đổi khi tải lại.

**Tiêu chí hoàn thành**

- Một đòn không gây sát thương lại ở mọi khung hình; tốc độ gây sát thương không phụ thuộc FPS.
- Không thể liên tục nhận lại chiến lợi phẩm bằng cách đi qua ranh giới chunk hoặc tải lại trang.
- Tạm dừng/chuyển tab dừng mô phỏng chiến đấu và giải phóng trạng thái phím/nút đang giữ.
- Chế độ Thư giãn vẫn hoàn thành được tuyến khám phá chính.

**Chưa làm:** PvP, boss nhiều giai đoạn, cây kỹ năng lớn hoặc đột kích căn cứ.

### Giai đoạn 6 — v3.0: hoàn thiện để phát hành

**Làm gì**

- Chuẩn hóa kích thước, điểm neo và phong cách sprite; giữ nguồn và giấy phép của tài nguyên mới.
- Cải thiện hoạt ảnh tương tác, hiệu ứng nhặt đồ và phản hồi khi hành động không thành công.
- Thêm âm thanh môi trường nếu có nguồn phù hợp; tách âm lượng môi trường/hiệu ứng và tôn trọng cài đặt giảm chuyển động.
- Đo và tối ưu phần chậm thật sự: tìm vật thể gần người chơi, vẽ, ánh sáng, AI, kích thước bản lưu và tải tài nguyên.
- Kiểm tra trình duyệt desktop và điện thoại thật; ghi lại thiết bị đã thử và giới hạn còn biết.
- Hoàn thiện hướng dẫn, cân bằng nhịp chơi, kiểm tra bản phát hành dưới đường dẫn `/domeo/`.
- PWA/chơi lại khi mất mạng là hạng mục bổ sung sau khi bản chính ổn định, không chặn phát hành. Nếu làm, cần quản lý phiên bản cache và thông báo cập nhật an toàn, không ép đổi mã giữa lúc đang chơi.

**Tiêu chí hoàn thành**

- Không còn lỗi đã biết gây mất tiến trình, nhân đôi đồ hoặc kẹt vòng chơi chính.
- Bộ kiểm thử tự động đạt; có một lượt chơi xuyên suốt các tính năng đã chọn.
- Có kết quả thử trên ít nhất một điện thoại Android/Chrome và một iPhone/Safari trước khi khẳng định hỗ trợ hai nhóm thiết bị này. Giả lập không thay thế kiểm thử thiết bị thật.
- Có bản sao lưu, ghi chú thay đổi và cách xử lý khi bản phát hành gặp lỗi.
- Chỉ cập nhật GitHub Pages sau khi bản đó được duyệt.

## 5. Các quyết định kỹ thuật phải giữ xuyên suốt

### 5.1. Tách ba loại phiên bản

- **Phiên bản game:** ví dụ v2.0, v2.1.
- **Phiên bản cấu trúc bản lưu:** hiện là `SAVE_VERSION = 1`.
- **Phiên bản thuật toán sinh thế giới:** cần bổ sung, ví dụ `world.generationVersion`.

Hiện `validateSave()` kiểm tra các loại vật phẩm hiện có và chỉ chấp nhận công trình `campfire`/`wall`. Nếu thêm vật phẩm hoặc rương mà không có bước chuyển đổi, bản lưu cũ có thể bị từ chối.

Ngoài ra, ID tài nguyên hiện gắn với vị trí trong danh sách sinh chunk. Đổi thứ tự sinh mà không giữ thuật toán cũ có thể làm thay đổi đối tượng mang cùng ID. Vì vậy, việc bảo vệ thế giới cũ phải được làm **trước** giai đoạn thêm vùng sinh thái.

Quy trình đề xuất:

> Đọc dữ liệu → nhận diện phiên bản → chuyển đổi từng bước nếu được hỗ trợ → kiểm tra định dạng mới → giữ bản sao cũ trước khi ghi thay thế.

Không coi một bản lưu từ phiên bản chưa hỗ trợ là lý do để tự tạo thế giới mới rồi ghi đè lên nó.

### 5.2. Mở rộng module khi có nhu cầu thật

| Phần hiện có                | Hướng mở rộng                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/config.js`             | Tách dữ liệu vật phẩm, công thức, công trình khi danh sách lớn lên; dùng ID ổn định                  |
| `src/game.js`               | Giữ vai trò điều phối; tách các hệ thống rương/xây dựng/nhiệm vụ/chiến đấu khi chúng được triển khai |
| `src/world.js`              | Quản lý phiên bản sinh thế giới, địa hình và truy vấn vùng gần; giữ giới hạn cache                   |
| `src/storage.js`            | Bổ sung chuyển đổi schema, sao lưu, nhập/xuất và xử lý xung đột phiên                                |
| `src/renderer.js`           | Bổ sung lớp địa hình, sprite và hiệu ứng; đo trước khi tối ưu lớn                                    |
| `src/input.js`, `src/ui.js` | Mọi thao tác mới đều có đường dùng được bằng bàn phím và cảm ứng                                     |
| `tests/`                    | Thêm ca hồi quy ngay trong đợt triển khai tính năng tương ứng                                        |

Không chuyển framework, viết lại bằng engine khác hoặc thêm ECS chỉ vì dự án đang lớn hơn. Chỉ đổi kiến trúc khi có vấn đề cụ thể và lợi ích đo được.

### 5.3. Lưu ít dữ liệu nhưng đủ khôi phục

- Không lưu lại toàn bộ chunk; lưu seed, phiên bản sinh thế giới và những thay đổi cần tồn tại.
- Rương, nhiệm vụ, công trình và điểm khám phá đều có ID ổn định.
- Thông tin bản đồ đã khám phá cần biểu diễn gọn và có ngân sách dung lượng riêng.
- Giới hạn kích thước phải nhất quán giữa ghi, đọc và nhập file.
- Chỉ chuyển sang IndexedDB khi dữ liệu thực tế cần điều đó, kèm kế hoạch chuyển đổi và khôi phục; không thêm đồng thời hai hệ lưu phức tạp ngay từ đầu.

## 6. Kiểm thử và thước đo chất lượng

### Kiểm thử tối thiểu cho mỗi đợt

- Giữ các ca kiểm thử hiện có; chỉ cập nhật kỳ vọng khi hành vi được chủ động thay đổi và có giải thích.
- Thêm kiểm thử logic cho quy tắc mới và một luồng trình duyệt đi từ thao tác đến lưu/tải lại.
- Kiểm tra chuyển tab, tạm dừng, thao tác lặp nhanh, hết chỗ chứa, hết nguyên liệu và dữ liệu nhập hỏng.
- Kiểm tra cả hành trình mới lẫn bản lưu từ phiên bản trước.

### Mục tiêu cần đo, không coi là kết quả đã đạt

| Nội dung       | Mục tiêu ban đầu                                                                         |
| -------------- | ---------------------------------------------------------------------------------------- |
| Máy tính       | Hướng tới 60 FPS ở 1080p trên cấu hình thử được ghi rõ                                   |
| Điện thoại     | Ít nhất 30 FPS trong cảnh chơi thông thường trên thiết bị tầm trung được chọn để thử     |
| Bộ nhớ         | Cache chunk không vượt giới hạn; các vùng bị bỏ khỏi cache không tiếp tục chạy AI        |
| Lưu tiến trình | Khôi phục đúng sau lưu/tải lại; báo lỗi rõ thay vì giả vờ đã lưu                         |
| Khám phá lâu   | Có kịch bản đi qua nhiều chunk trong 20–30 phút để theo dõi bộ nhớ và kích thước bản lưu |
| Người chơi mới | Có thể tìm thức ăn, làm công cụ và hiểu mục tiêu tiếp theo mà không cần đọc mã nguồn     |

Các chỉ số trên được đo cục bộ khi thử nghiệm; không tự thêm theo dõi hành vi hay gửi dữ liệu người chơi ra dịch vụ bên ngoài.

## 7. Những việc chủ động để sau

- Multiplayer, tài khoản và cloud save: cần backend, vận hành, bảo mật và xử lý đồng bộ; không còn là dự án tĩnh đơn giản.
- Trồng trọt quy mô lớn, mùa, thời tiết gây sát thương, khát nước và độ bền: dễ tạo quá nhiều việc phải quản lý trước khi vòng chơi chính hấp dẫn.
- Thú nuôi, NPC đông, hệ giao dịch, mod và boss lớn: chỉ thêm khi đã có mục đích rõ trong vòng chơi.
- Nhà nhiều tầng, phương tiện và tự động hóa: chi phí cao so với lợi ích của giai đoạn hiện tại.

Đây không phải các ý tưởng bị loại bỏ vĩnh viễn; chúng chưa nên chen vào đường phát triển chính.

## 8. Đợt triển khai đầu tiên được khuyến nghị

**Chọn v2.1 làm đợt tiếp theo**, theo thứ tự:

- [ ] Tạo bộ bản lưu mẫu: hành trình mới, đã thu thập/chế tạo/xây dựng và đã kết thúc.
- [ ] Bổ sung chuyển đổi bản lưu; gắn phiên bản sinh thế giới cho dữ liệu cũ mà không đổi địa hình.
- [ ] Thêm sao lưu, xuất/nhập file và xác nhận ghi đè.
- [ ] Xử lý tình huống hai tab và lỗi bộ nhớ.
- [ ] Bổ sung cài đặt cơ bản; rà soát vùng chạm và bố cục màn hình nhỏ.
- [ ] Chạy kiểm thử, chơi thử và sửa lỗi trước khi mở giai đoạn xây căn cứ.

**Sau đó làm một bản nhỏ của v2.2 trước:** rương → chuyển đồ → bàn chế tạo → một công thức nâng cao → lưu/tải lại toàn bộ. Khi luồng này ổn mới thêm nhiều cấu kiện và món ăn.

Chưa ấn định lịch theo ngày vì còn phụ thuộc số lượng hình ảnh/âm thanh mới, thiết bị thử và phản hồi sau từng đợt. Phạm vi tương đối: v2.1 và v2.4 ở mức vừa; v2.2, v2.3 và v2.5 ở mức lớn; v3.0 phụ thuộc kết quả kiểm thử thực tế. Nếu cần rút ngắn lộ trình, hoãn chiến đấu và PWA, không cắt phần bảo vệ bản lưu hoặc kiểm thử.

---

**Tóm lại:** ưu tiên làm game có chiều sâu bằng căn cứ, khám phá và mục tiêu dài hạn; không biến lộ trình thành danh sách thật nhiều tính năng thiếu liên kết.
