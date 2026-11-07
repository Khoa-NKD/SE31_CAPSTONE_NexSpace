# Hướng dẫn đồng bộ cấu hình bí mật (application-local.properties) - NexSpace Backend

Tài liệu này hướng dẫn cách đồng bộ và cấu hình file `application-local.properties` cho backend `spring-starter` trong nhóm dự án NexSpace một cách an toàn, bảo mật, không để lộ thông tin nhạy cảm (database password, JWT secret, Gmail app password, Cloudinary credentials) lên Git repository.

---

## 1. Dành cho thành viên mới (Setup lần đầu khi vừa clone repo)

### Cách A: Tự động tải từ Secret Gist của nhóm (Khuyên dùng)
1. Liên hệ trưởng nhóm để lấy **Link Secret Gist** của dự án.
2. Chạy công cụ đồng bộ:
   - **Trên Windows:** Double-click file `sync-config.bat` (hoặc chạy `.\sync-config.ps1` trong PowerShell).
   - **Trên macOS / Linux:** Mở terminal tại thư mục gốc và chạy:
     ```bash
     chmod +x sync-config.sh run-backend.sh
     ./sync-config.sh
     ```
3. Khi terminal yêu cầu nhập link Gist, dán link bí mật do trưởng nhóm cung cấp và nhấn `Enter`.
4. Script sẽ tự động tải và tạo file `spring-starter/src/main/resources/application-local.properties`. Đường link sẽ được lưu lại trong `.gist-url` (đã gitignored) để các lần sau không cần nhập lại.

### Cách B: Chạy 1-Click tự động (1-Click Run)
- **Trên Windows:** Double-click `run-backend.bat`
- **Trên macOS / Linux:** Chạy `./run-backend.sh`
- Script sẽ tự động kiểm tra xem bạn đã có file cấu hình chưa. Nếu chưa, script sẽ hỏi link Gist và sau đó tự khởi động Spring Boot bằng Maven Wrapper.

### Cách C: Thiết lập thủ công (Offline Mode)
Nếu không có kết nối Gist hoặc muốn dùng database local riêng:
1. Sao chép file mẫu:
   ```bash
   cp spring-starter/src/main/resources/application-local.properties.example spring-starter/src/main/resources/application-local.properties
   ```
2. Mở file `spring-starter/src/main/resources/application-local.properties` và điền username/password MySQL của máy bạn.

---

## 2. Dành cho thành viên khi cập nhật cấu hình (Đổi mật khẩu DB, thêm biến môi trường mới)

1. Mở đường link Secret Gist trên trình duyệt.
2. Nhấn nút **Edit** ở góc phải.
3. Cập nhật các giá trị cấu hình mới và nhấn **Update secret gist**.
4. Nhắn thông báo lên nhóm chat: *"Đã cập nhật biến môi trường mới, mọi người chạy lại `sync-config` nhé."*
5. Các thành viên khác chỉ cần chạy lại `sync-config.bat` (hoặc `./sync-config.sh`) là file trên máy sẽ được cập nhật phiên bản mới nhất ngay lập tức.
