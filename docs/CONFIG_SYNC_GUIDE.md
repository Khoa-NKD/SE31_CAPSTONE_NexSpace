# Hướng dẫn đồng bộ cấu hình bí mật (application-local.properties) - NexSpace

Tài liệu này hướng dẫn cách đồng bộ file cấu hình `application-local.properties` giữa các thành viên trong nhóm dự án NexSpace một cách an toàn và bảo mật, không để lộ thông tin nhạy cảm (database password, JWT secret, Gmail app password) lên public Git repository.

---

## 1. Dành cho thành viên mới (Setup lần đầu)

1. Kéo code mới nhất từ Git:
   ```bash
   git pull origin feature/frontend
   ```
2. Liên hệ trưởng nhóm để lấy **Link Secret Gist** của dự án.
3. Chạy script đồng bộ:
   - **Trên Windows (khuyên dùng):** Double-click file `sync-config.bat` ở thư mục gốc dự án.
   - **Hoặc qua PowerShell:**
     ```powershell
     .\sync-config.ps1
     ```
4. Khi terminal yêu cầu nhập link Gist, dán đường link bí mật do trưởng nhóm cung cấp và nhấn `Enter`.
5. Script sẽ tự động tải và tạo file `spring-starter/src/main/resources/application-local.properties`. Đường link sẽ được lưu lại trong `.gist-url` (đã gitignored) để các lần sau không cần nhập lại.

---

## 2. Dành cho thành viên khi cập nhật cấu hình (Đổi pass DB, thêm biến mới)

1. Mở đường link Secret Gist trên trình duyệt.
2. Nhấn nút **Edit** ở góc phải.
3. Cập nhật các giá trị mới và nhấn **Update secret gist**.
4. Nhắn thông báo lên nhóm chat: *"Đã cập nhật cấu hình, mọi người chạy lại `sync-config.bat` nhé."*
5. Các thành viên khác chỉ cần click `sync-config.bat` là file trên máy sẽ được đè bản mới nhất ngay lập tức.
