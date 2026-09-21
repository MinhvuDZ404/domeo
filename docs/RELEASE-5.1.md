# Domeo 5.1 — Final Evolution

## Nội dung đã triển khai

- Combat nhẹ với đòn đánh cơ bản (`Space`), hỗ trợ cảm ứng, i-frame, telegraph, ba sinh vật theo biome/thời gian và Hộ Vệ Cổ.
- AI giới hạn bán kính, tick 10 Hz, tối đa 7 thực thể hoạt động; kẻ địch ngủ/despawn ngoài vùng mô phỏng.
- Hành trình 8 nhiệm vụ có stable ID, tiến độ, phần thưởng chỉ nhận một lần và mục tiêu dài hạn khôi phục hải đăng.
- Căn trại 3 cấp: bếp lửa, bàn thợ, hải đăng. Mỗi cấp có chi phí và hiệu ứng gameplay.
- Vũ khí tinh luyện mở tại bàn thợ; mảnh hộ vệ nối combat với nâng trại.
- Nội dung mới được vẽ Canvas 2D, không thêm ảnh hay audio asset.

## Save migration

Schema tăng từ 3 lên 4. Migration 5.0 → 5.1 thêm các trường `camp`, `progression`, `combat` và item mới bằng giá trị an toàn. `seed`, `generationVersion`, terrain, player, inventory cũ, chest, structures, explored, discoveries và elapsed được giữ. Migration 2.x/3.x/4.x trước đây vẫn đi qua các bước cũ trước khi lên v4.

## Kiểm thử và hiệu năng

Các kiểm thử logic bao phủ combat, quest, nâng trại, nhận thưởng một lần và migration. Chạy các lệnh trong checklist bên dưới để xem kết quả tại commit phát hành. AI không chạy mỗi render frame; particles, enemies, lights, chunks và save records đều có hard cap.

## Giới hạn đã biết

- Kẻ địch thường là transient; chỉ kill count, cooldown spawn có giới hạn và thay đổi progression có ý nghĩa được lưu.
- Không có pathfinding toàn thế giới; AI đi thẳng và tránh obstacle tại bước kế tiếp.
- Kiểm thử cảm ứng Playwright không thay thế thiết bị iOS/Android thật.
- Chưa xác nhận trên phần cứng iPhone/iPad hoặc mọi GPU di động; cần manual device pass trước khi gắn release công khai.

## Release checklist

- [ ] `npm ci`
- [ ] `npm test`
- [ ] `npm run format:check`
- [ ] `npm run perf`
- [ ] `npm run perf:check`
- [ ] `npm run balance`
- [ ] `npm run test:e2e`
- [ ] Chromium desktop playtest: gather → camp → landmark → combat → upgrade → save/reload
- [ ] Mobile portrait/landscape controls and modal check
- [ ] Firefox desktop manual pass
- [ ] iOS Safari and Android Chrome physical-device pass
- [ ] Verify GitHub Pages subpath `/domeo/`
- [ ] Verify legacy PNG checksums/paths and generation-v1 fixture

Mục tiêu phát hành là không có lỗi blocking hoặc regression đã biết; tài liệu này không tuyên bố game tuyệt đối không thể có lỗi trên mọi thiết bị.
