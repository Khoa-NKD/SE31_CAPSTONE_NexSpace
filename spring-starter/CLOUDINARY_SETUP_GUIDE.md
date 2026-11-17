# Hướng dẫn Cấu hình Cloudinary Media Storage (NexSpace)

Tài liệu này hướng dẫn cách lấy khóa API Cloudinary miễn phí và cấu hình vào NexSpace Backend để lưu trữ hình ảnh không gian làm việc.

---

## 1. Đăng ký Tài khoản Cloudinary Miễn phí
1. Truy cập [https://cloudinary.com/users/register_free](https://cloudinary.com/users/register_free).
2. Hoàn tất đăng ký và kích hoạt email.
3. Sau khi đăng nhập vào **Cloudinary Console Dashboard**, bạn sẽ thấy mục **Product Environment Credentials**:
   - **Cloud Name** (ví dụ: `dxyzt123`)
   - **API Key** (ví dụ: `123456789012345`)
   - **API Secret** (ví dụ: `abcdefghijklmnopqrstuvwxyz12345`)

---

## 2. Cấu hình vào Môi trường Local (`application-local.properties`)
Mở file `spring-starter/src/main/resources/application-local.properties` và thêm các dòng sau:

```properties
# Cloudinary Media Storage Configuration
cloudinary.cloud-name=your_cloud_name_here
cloudinary.api-key=your_api_key_here
cloudinary.api-secret=your_api_secret_here
cloudinary.folder.nexspace=nexspace
cloudinary.folder.nexspace.workspace=nexspace/workspaces/{id}
```

*(Lưu ý: File `application-local.properties` được `.gitignore` bảo vệ, tuyệt đối không commit lên Git).*

---

## 3. Cơ chế Fallback Tự động (Local Fallback)
Nếu bạn chưa cấu hình Cloudinary credentials (để trống):
- Hệ thống sẽ tự động kích hoạt **Local Storage Provider** lưu file tại thư mục `uploads/` trên máy chủ và trả về URL ảnh truy cập an toàn.
- Giúp team phát triển có thể chạy kiểm thử backend và frontend offline mà không bắt buộc phải có internet hoặc tài khoản Cloudinary ngay lập tức.

