# Domeo — Một chuyến đi hoang dã

Game sinh tồn 2D góc nhìn từ trên xuống, viết bằng **JavaScript thuần, ES modules và HTML5 Canvas**. Không có backend, framework hay bước build bắt buộc.

Trang GitHub Pages của dự án: <https://minhvudz404.github.io/domeo/>. Các thay đổi mới chỉ xuất hiện trên trang này sau khi nhánh dùng để triển khai được cập nhật.

## Có gì trong bản 4.0?

Bản 4.0 cho bạn **một nơi để trở về**: rương, nướng ăn, la bàn về nhà, bản đồ đã khám phá, và nâng
cấp bản lưu từ 2.0/3.0 mà không mất thế giới. Chi tiết trong `CHANGELOG.md`.

Bản 4.0.1 sửa lỗi **đơ khi bắt đầu hành trình**: hai hàm vẽ la bàn và rương chưa được viết nên vòng
lặp vẽ dừng lại ngay khung hình đầu, và lỗi chuyển đồ trong rương. Từ đây bộ kiểm thử logic kiểm tra
luôn việc mọi hàm mà giao diện gọi đều tồn tại.

### Nền tảng từ 3.0

## Có gì trong bản 3.0?

Bản 3.0 **hoàn thiện trải nghiệm** của vòng chơi hiện có (khám phá, hái lượm, chế tạo, dựng chỗ dừng
chân) chứ không thêm hệ thống chơi mới. Các mốc rương, vùng sinh thái, nhiệm vụ và chiến đấu trong
`docs/ROADMAP.md` vẫn đang chờ; xem `CHANGELOG.md` để biết đầy đủ.

- **Cài đặt trong game** (nút bánh răng, phím `O`, hoặc từ màn hình tạm dừng): âm lượng, âm thanh
  môi trường, hiệu ứng khi hái lượm, giảm chuyển động, bảng thông số và nút trả về mặc định.
- **Âm thanh môi trường** tổng hợp bằng Web Audio: tiếng gió và chim rừng, tự nhỏ đi khi bạn chuyển
  tab. Không có tệp âm thanh ngoài, không tải gì từ mạng.
- **Phản hồi rõ ràng hơn:** hạt lá/đá khi hái lượm, tia lửa khi dựng công trình, và khung nhắc rung
  nhẹ kèm lời giải thích khi hành động không hợp lệ (ví dụ quên chế tạo rìu).
- **Hình ảnh:** thang màu ấm ở bình minh/hoàng hôn và lạnh về đêm, tách khỏi lớp ánh sáng ban đêm.
- **Hiệu năng:** truy vấn vật thể nhanh hơn khoảng một nửa nhờ chỉ mục công trình và vẽ theo lô;
  số đo và cách tự đo FPS trên máy bạn nằm trong `docs/PERFORMANCE.md`.
- **Cân bằng có số liệu:** `npm run balance` mô phỏng nhiều hành trình và ghi kết quả vào
  `docs/BALANCE.md`; các hằng số sinh tồn được gom về một chỗ trong `src/config.js`.
- **Bản lưu cũ dùng được ngay:** cấu trúc bản lưu vẫn là phiên bản 1, hành trình từ 2.0 nạp và chơi
  tiếp mà không đổi thế giới.

Bản bên dưới là nội dung 2.0 đã có sẵn và vẫn đúng:

### Nền tảng từ 2.0

- **Khám phá:** thế giới sinh theo seed, camera bám nhân vật, vùng xuất phát an toàn và tài nguyên khởi đầu được bảo đảm.
- **Sinh tồn:** máu, độ no, ăn quả, chu kỳ ngày–đêm 120 giây, đuốc và ánh sáng lửa trại. Đứng gần lửa khi độ no trên 20 sẽ hồi máu.
- **Hái lượm:** nhặt cành khô, đá cuội, hái quả/sợi; dùng rìu chặt cây và cuốc khai thác tảng đá.
- **Túi đồ & chế tạo:** 9 loại vật phẩm, 5 công thức, kiểm tra nguyên liệu, công cụ tự sử dụng, hotbar, đặt lửa trại và hàng rào.
- **Giao diện:** menu, hướng dẫn, mục tiêu khởi đầu, tạm dừng, chơi lại, âm thanh tương tác tùy chọn, thông báo và hỗ trợ bàn phím trong hộp thoại.
- **Điện thoại:** giao diện co giãn, joystick cảm ứng, nút hái lượm/ăn quả, hỗ trợ màn hình dọc và ngang.
- **Lưu tiến trình:** tự lưu mỗi 15 giây _thời gian chơi_, lưu thủ công và lưu khi ẩn/rời trang. Có xác nhận trước khi thay thế một hành trình còn sống.

Đây là bản chơi đơn tập trung vào khám phá và chế tạo. Chưa có quái vật, chiến đấu, nhà hoàn chỉnh hay đồng bộ nhiều thiết bị.

## Chạy tại máy

Cần **Node.js 22 trở lên**:

```sh
npm start
```

Mở `http://localhost:5173`. Server lắng nghe trên `0.0.0.0`, phù hợp cả môi trường xem trước được proxy. Có thể đổi cổng bằng biến môi trường `PORT`.

Game không có phụ thuộc runtime. Một HTTP server tĩnh khác cũng dùng được, ví dụ:

```sh
python3 -m http.server 5173 --bind 0.0.0.0
```

**Không mở `index.html` trực tiếp bằng `file://`**, vì trình duyệt hạn chế tải ES modules từ file cục bộ. Hình ảnh và phông chữ đều được phục vụ cùng ứng dụng; không gọi API hay CDN bên ngoài trong lúc chơi.

## Điều khiển

| Phím                   | Tác dụng                                                |
| ---------------------- | ------------------------------------------------------- |
| `WASD` / mũi tên       | Di chuyển, tốc độ chéo đã được chuẩn hóa                |
| `E` (có thể giữ)       | Hái lượm/chặt cây/đào đá gần nhất                       |
| `F` / `1`              | Ăn một quả: +25 no, +3 máu                              |
| `B` / `Tab`            | Mở túi đồ; `B` lần nữa hoặc `Esc` để đóng               |
| `C`                    | Mở mục chế tạo                                          |
| `2` / `3`              | Xem trạng thái rìu/cuốc; mở chế tạo nếu chưa có         |
| `4` / `6`              | Chọn đặt lửa trại/hàng rào đã chế tạo                   |
| Nhấp/chạm đất hoặc `E` | Xác nhận vị trí xây đang chọn                           |
| `5`                    | Bật/tắt đuốc đã chế tạo                                 |
| `O` / `M`              | Mở cài đặt / bật-tắt âm thanh                           |
| `Esc`                  | Hủy đặt công trình, đóng túi đồ/hướng dẫn hoặc tạm dừng |

Trên điện thoại, dùng joystick ở góc trái, các nút cảm ứng và thanh vật phẩm. Công trình cần vùng đất trống, không quá gần hoặc quá xa nhân vật; bóng xem trước màu xanh biểu thị vị trí hợp lệ.

### Công thức

| Vật phẩm | Nguyên liệu  | Công dụng                                      |
| -------- | ------------ | ---------------------------------------------- |
| Rìu đá   | 4 gỗ + 2 đá  | 3 nhát chặt cây thu 5 gỗ                       |
| Cuốc đá  | 3 gỗ + 4 đá  | 3 nhát khai thác thu 5 đá                      |
| Lửa trại | 6 gỗ + 4 đá  | Soi sáng, hồi máu khi đủ no và đứng gần        |
| Đuốc     | 3 gỗ + 2 sợi | Nguồn sáng mang theo nhân vật                  |
| Hàng rào | 4 gỗ         | Công trình có va chạm để đánh dấu nơi trú chân |
| Rương gỗ | 6 gỗ + 2 sợi | Cất đồ; đứng gần nhấn E để mở                  |

Rìu, cuốc và đuốc chỉ cần chế tạo một lần. Mỗi loại vật phẩm tối đa 999 đơn vị; mỗi thế giới tối đa 100 công trình.

## Cách lưu hoạt động

- Một bản lưu JSON có phiên bản tại khóa `domeo.journey.v1` trong `localStorage`.
- Lưu seed, vị trí, máu/no, túi đồ, mục tiêu, công trình và những tài nguyên đang hồi; **không lưu toàn bộ chunk đã khám phá**.
- Thời gian sinh tồn không trôi khi mở túi đồ, tạm dừng hoặc rời game. Khi quay lại tab, cần chủ động tiếp tục.
- Bản lưu hỏng, sai phiên bản, quá lớn hoặc chứa giá trị không hợp lệ được từ chối. Lỗi bộ nhớ đầy/bị chặn có thông báo, không làm sập game.
- Bản lưu chỉ ở trình duyệt và origin hiện tại. Xóa dữ liệu trình duyệt sẽ xóa tiến trình; bản xem trước và GitHub Pages có bản lưu riêng. Chưa có cloud save hoặc hợp nhất tiến trình giữa nhiều tab.

## Những lỗi nền tảng đã xử lý

- **Hồi quả qua ngày–đêm:** dùng đồng hồ mô phỏng tăng liên tục; chỉ lấy modulo khi hiển thị chu kỳ. Thời điểm hồi không bị mắc kẹt sau giây 120.
- **Thế giới không ổn định:** sinh chunk dựa trên seed và tọa độ, không phụ thuộc vị trí nhân vật lúc phát sinh; không dùng trị tuyệt đối gây đối xứng seed.
- **Bộ nhớ bản đồ:** LRU tối đa 64 chunk, tự loại thay đổi tài nguyên đã hết hạn, chỉ vẽ vật thể gần khung nhìn. Giới hạn độ phân giải Canvas để tránh dùng quá nhiều bộ nhớ trên màn hình lớn.
- **Điều khiển/va chạm:** xóa trạng thái phím và joystick khi mất focus, chặn bước nhảy thời gian, chia nhỏ bước di chuyển, cho phép thoát khỏi cây vừa mọc lại và không để tài nguyên mọc xuyên công trình.
- **Tải tài nguyên:** gắn sự kiện trước khi đặt nguồn ảnh; có đồ họa dự phòng khi ảnh không tải được.

## Kiểm thử, hiệu năng và định dạng

```sh
npm ci
npm test                 # 71 kiểm thử logic bằng node:test
npm run perf             # đo thời gian xử lý mỗi bước và truy vấn vật thể
npm run perf:check       # thoát mã lỗi nếu vượt ngân sách hiệu năng
npm run balance          # mô phỏng nhịp chơi, in báo cáo cân bằng
npm run format:check

# Cài trình duyệt kiểm thử lần đầu; Linux có thể cần --with-deps.
npx playwright install chromium
npm run test:e2e         # 22 kịch bản Chromium, gồm giả lập màn hình cảm ứng
```

Bộ kiểm thử trình duyệt bao phủ di chuyển, tạm dừng, focus hộp thoại, hái/ăn/chế tạo/đặt công trình, rương và chuyển đồ, la bàn và bản đồ nhỏ, lưu và tải lại, tự lưu, chơi lại, bộ nhớ bị chặn, ảnh dự phòng, đường dẫn con GitHub Pages, joystick, màn hình nhỏ, cài đặt và bảng thông số. Đây là kiểm thử cảm ứng giả lập trong Chromium, **không thay thế kiểm thử trực tiếp trên mọi thiết bị iOS/Android**.

Nếu môi trường đã cung cấp Chromium ở vị trí riêng, đặt `PLAYWRIGHT_CHROMIUM_EXECUTABLE` tới file thực thi đó. Traces/ảnh lỗi nằm trong `.cache/test-results/` và không được đưa vào Git.

```sh
npm run format          # Định dạng mã bằng Prettier
```

Workflow `.github/workflows/ci.yml` chạy định dạng, kiểm thử logic, ngân sách hiệu năng, báo cáo cân bằng và kịch bản trình duyệt trên GitHub. Không tự triển khai hay thay đổi cấu hình GitHub Pages.

## Cấu trúc

```text
index.html             Giao diện và hộp thoại truy cập được bằng bàn phím
styles.css             Bố cục, màu sắc, responsive, reduced-motion
main.js                Vòng lặp, chuyển trạng thái màn hình, lưu và nối các module
src/
  config.js            Hằng số cân bằng, vật phẩm, công thức và đồng hồ ngày–đêm
  world.js             Sinh chunk, LRU, tài nguyên, hitbox và công trình
  game.js              Mô phỏng và các hành động; không phụ thuộc DOM
  storage.js           Kiểm tra schema và đọc/ghi bản lưu an toàn
  settings.js          Cài đặt người chơi, lưu riêng khỏi bản lưu hành trình
  renderer.js          Canvas, sprite, ánh sáng và hiệu ứng
  input.js             Bàn phím, con trỏ, joystick và xử lý mất focus
  ui.js                HUD, mục tiêu, túi đồ và chế tạo
  icons.js / sound.js   Icon SVG và âm thanh Web Audio (hiệu ứng + môi trường)
assets/                Sprite gốc, môi trường và phông chữ cục bộ
scripts/serve.mjs       HTTP server phát triển không cần dependency
scripts/perf.mjs        Đo hiệu năng phần logic và kiểm tra ngân sách
scripts/balance.mjs     Mô phỏng nhịp chơi để lấy số liệu cân bằng
tests/                 Kiểm thử logic và Playwright
```

## Ghi chú về phát hành

- Đo trên thiết bị thật: bật **Bảng thông số** trong Cài đặt (hoặc mở `?debug=1`) để xem FPS, số
  vật thể và độ phân giải đang vẽ. Danh sách việc cần kiểm tra và phần còn để ngỏ nằm trong
  `docs/RELEASE-3.0.md`.
- Chưa có PWA/ngoại tuyến; lý do và cách làm an toàn được ghi trong `docs/RELEASE-3.0.md`.

## GitHub Pages

Đây là website tĩnh: phục vụ thư mục gốc của repo, không cần build. Mọi đường dẫn tài nguyên/module dùng đường dẫn tương đối, tương thích `/domeo/`. Khi sẵn sàng phát hành, merge thay đổi vào nhánh đã chọn trong **Settings → Pages** theo quy trình hiện có của bạn.

## Phông chữ

Be Vietnam Pro và Playfair Display được phân phối kèm ứng dụng dưới SIL Open Font License. Thông tin giấy phép ở `assets/fonts/BeVietnamPro-OFL.txt` và `assets/fonts/PlayfairDisplay-OFL.txt`. Hình ảnh nhân vật/cây/cỏ gốc của dự án được giữ nguyên.
