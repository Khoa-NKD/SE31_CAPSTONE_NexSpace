# 🚀 Hướng Dẫn Kiểm Thử Toàn Diện 8 Chức Năng Authentication Trên Postman (NexSpace Platform)

Tài liệu này cung cấp hướng dẫn chi tiết từng bước (step-by-step) để kiểm thử và đối chiếu nghiệm thu 8 chức năng Authentication & Identity của Backend NexSpace (`spring-starter` - Spring Boot 3.5) bằng **Postman**.

---

## 📑 Mục Lục
1. [Khởi Động Dự Án & Cấu Hình Postman Environment](#1-khởi-động-dự-án--cấu-hình-postman-environment)
2. [Cách Import Postman Collection Có Sẵn (1 Click)](#2-cách-import-postman-collection-có-sẵn-1-click)
3. [Bảng Kết Quả Kiểm Thử Thực Tế (Live Test Results)](#3-bảng-kết-quả-kiểm-thử-thực-tế-live-test-results)
4. [Chi Tiết Kịch Bản Kiểm Thử 8 Chức Năng](#4-chi-tiết-kịch-bản-kiểm-thử-8-chức-năng)
   - [Chức năng 1: Đăng ký tài khoản (Register)](#chức-năng-1-đăng-ký-tài-khoản-register)
   - [Chức năng 2: Đăng nhập & Cơ chế Brute-Force (BR-03)](#chức-năng-2-đăng-nhập--cơ-chế-brute-force-br-03)
   - [Chức năng 3: Đăng xuất & Thu hồi Token Blacklist](#chức-năng-3-đăng-xuất--thu-hồi-token-blacklist)
   - [Chức năng 4: Quên mật khẩu & Kiểm tra Token](#chức-năng-4-quên-mật-khẩu--kiểm-tra-token)
   - [Chức năng 5: Đặt lại mật khẩu (Complete Forgot Password)](#chức-năng-5-đặt-lại-mật-khẩu-complete-forgot-password)
   - [Chức năng 6: Đổi mật khẩu (Change Password)](#chức-năng-6-đổi-mật-khẩu-change-password)
   - [Chức năng 7: Xác minh email (Verify Email - JSON & Redirect)](#chức-năng-7-xác-minh-email-verify-email---json--redirect)
   - [Chức năng 8: Khóa & Mở khóa tài khoản (Admin Lock/Unlock - BR-31)](#chức-năng-8-khóa--mở-khóa-tài-khoản-admin-lockunlock---br-31)
5. [Bảng Mã Trạng Thái HTTP & Lỗi Phổ Biến](#5-bảng-mã-trạng-thái-http--lỗi-phổ-biến)

---

## 1. Khởi Động Dự Án & Cấu Hình Postman Environment

### 1.1 Kiểm tra trạng thái máy chủ
Hệ thống NexSpace bao gồm 2 service hoạt động song song:
- **Backend API (Spring Boot 3.5)**: Cổng `8080`
  - URL kiểm tra: `http://localhost:8080/v3/api-docs`
  - Swagger UI: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)
  - Lệnh khởi chạy thủ công (nếu cần): `cd spring-starter && .\mvnw.cmd spring-boot:run`
- **Frontend Web (React 19 / TanStack Start)**: Cổng `3000`
  - URL truy cập: [http://localhost:3000](http://localhost:3000)
  - Giao diện Đăng nhập: [http://localhost:3000/auth/sign-in](http://localhost:3000/auth/sign-in)
  - Lệnh khởi chạy thủ công (nếu cần): `cd react-stater && npm run dev`

### 1.2 Tạo Postman Environment
Trong Postman, tạo một **Environment** mới (ví dụ: `NexSpace Local`) và khai báo các biến:

| Tên biến (Variable) | Initial Value | Current Value | Mô tả |
| :--- | :--- | :--- | :--- |
| `baseUrl` | `http://localhost:8080` | `http://localhost:8080` | URL Backend trực tiếp (hoặc `http://localhost:3000` qua proxy) |
| `adminToken` | *(Để trống)* | *(Tự động gán)* | JWT Access Token của Quản trị viên (`admin`) |
| `accessToken` | *(Để trống)* | *(Tự động gán)* | JWT Access Token của User thử nghiệm |
| `testUserId` | `8` | `8` | ID user dùng để test khóa/mở khóa |
| `resetToken` | *(Để trống)* | *(Lấy từ console/email)* | Token khôi phục mật khẩu |
| `verifyToken` | *(Để trống)* | *(Lấy từ console/email)* | Token xác thực email |

---

## 2. Cách Import Postman Collection Có Sẵn (1 Click)

Dự án đã chuẩn bị sẵn file Collection chuẩn Postman v2.1 tại:
📂 [NexSpace_Auth_Postman_Collection.json](file:///d:/NexSpace/docs/api/NexSpace_Auth_Postman_Collection.json)

**Các bước import:**
1. Mở Postman -> Chọn nút **Import** (ở góc trên bên trái).
2. Kéo thả file `d:\NexSpace\docs\api\NexSpace_Auth_Postman_Collection.json` vào Postman.
3. Nhấn **Import**. Toàn bộ 16 request kèm Test Scripts tự động lưu biến token đã được thiết lập hoàn chỉnh.

---

## 3. Bảng Kết Quả Kiểm Thử Thực Tế (Live Test Results)

Toàn bộ 8 chức năng đã được chạy kiểm thử tự động trực tiếp trên máy chủ đang chạy:

| STT | Kịch Bản Kiểm Thử | Endpoint & Method | Trạng Thái HTTP | Kết Quả Thực Tế |
| :--- | :--- | :--- | :--- | :--- |
| **0** | Đăng nhập Admin & Lấy Token | `POST /api/auth/login` | `200 OK` | ✅ **PASS** (Cấp JWT token) |
| **1a** | Đăng ký tài khoản người dùng mới | `POST /api/auth/register` | `201 Created` | ✅ **PASS** (`verified: false`, status `ACTIVE`) |
| **1b** | Chặn đăng ký trùng Email | `POST /api/auth/register` | `409 Conflict` | ✅ **PASS** (Báo "Email đã được sử dụng") |
| **2a** | Đăng nhập tài khoản sau xác thực | `POST /api/auth/login` | `200 OK` | ✅ **PASS** (Cấp JWT token người dùng) |
| **2b** | Khóa Brute-Force BR-03 (Sai 5 lần) | `POST /api/auth/login` | `401 Unauthorized` | ✅ **PASS** (Tạm khóa 15 phút tại lần thứ 5) |
| **3** | Đăng xuất & Thu hồi Token Blacklist | `POST /api/auth/logout`<br>`GET /api/auth/me` | `200 OK`<br>`401 Unauthorized` | ✅ **PASS** (Token bị đưa vào blacklist SHA-256) |
| **4** | Quên mật khẩu & Verify Token | `POST /api/auth/forgot-password/initiate`<br>`GET /api/auth/forgot-password/verify-token` | `200 OK`<br>`200 OK` | ✅ **PASS** (Token UUID hợp lệ `valid: true`) |
| **5** | Đặt lại mật khẩu hoàn tất | `POST /api/auth/forgot-password/complete` | `200 OK` | ✅ **PASS** (Đổi pass, reset lockout, chặn dùng lại) |
| **6** | Đổi mật khẩu định kỳ | `POST /api/auth/change-password` | `200 OK` | ✅ **PASS** (Xác thực pass cũ, chặn trùng pass cũ) |
| **7** | Xác thực Email (JSON REST API) | `POST /api/auth/verify-email` | `200 OK` | ✅ **PASS** (Kích hoạt `verified: true`) |
| **8a** | Khóa tài khoản bởi Admin (BR-31) | `PATCH /api/admin/users/{id}/status` | `200 OK` | ✅ **PASS** (Ghi vết reason, user bị chặn đăng nhập) |
| **8b** | Mở khóa tài khoản bởi Admin | `PATCH /api/admin/users/{id}/status` | `200 OK` | ✅ **PASS** (Mở khóa thành công, user đăng nhập lại được) |

---

## 4. Chi Tiết Kịch Bản Kiểm Thử 8 Chức Năng

---

### Chức năng 1: Đăng ký tài khoản (Register)

API cho phép người dùng vãng lai tạo tài khoản mới với role mặc định là `USER`.

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/register`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "userName": "johndoe",
    "email": "johndoe@example.com",
    "password": "Password@123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "0987654321"
  }
  ```

#### ✅ Kỳ vọng (Happy Case):
- **HTTP Status**: `201 Created`
- **Response Body**:
  ```json
  {
    "success": true,
    "data": {
      "id": 8,
      "userName": "johndoe",
      "email": "johndoe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "USER",
      "status": "ACTIVE",
      "verified": false
    },
    "message": "Đăng ký thành công",
    "statusCode": 201
  }
  ```

#### ❌ Test Cases Kiểm Tra Biên & Ngoại Lệ:
1. **Trùng email**: Gửi lại request với cùng email `johndoe@example.com` -> Kỳ vọng `409 Conflict` ("Email đã được sử dụng").
2. **Trùng username**: Gửi request với email khác nhưng giữ nguyên `userName: "johndoe"` -> Kỳ vọng `409 Conflict` ("Tên đăng nhập đã tồn tại").
3. **Mật khẩu quá ngắn**: Nhập `password: "123"` -> Kỳ vọng `400 Bad Request` ("Mật khẩu phải có ít nhất 6 ký tự").

---

### Chức năng 2: Đăng nhập & Cơ chế Brute-Force (BR-03)

API xác thực người dùng bằng username/email và mật khẩu, trả về cặp JWT Access Token và thông tin User. Tích hợp cơ chế tự động khóa chống Brute-Force.

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/login`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "username": "admin",
    "password": "Admin@123"
  }
  ```
- **Postman Tests Script** (tự động lưu `adminToken`):
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  var jsonData = pm.response.json();
  if (jsonData.success && jsonData.data && jsonData.data.accessToken) {
      pm.environment.set("adminToken", jsonData.data.accessToken);
      console.log("Token đã lưu:", jsonData.data.accessToken);
  }
  ```

#### ✅ Kỳ vọng (Happy Case):
- **HTTP Status**: `200 OK`
- **Response Body**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
      "tokenType": "Bearer",
      "expiresAt": "2026-11-04T12:38:02Z",
      "user": {
        "id": 1,
        "userName": "admin",
        "email": "admin@example.com",
        "role": "ADMIN",
        "status": "ACTIVE"
      }
    },
    "message": "Đăng nhập thành công",
    "statusCode": 200
  }
  ```

#### 🛡️ Kiểm tra Quy tắc Brute-Force BR-03:
1. Nhập sai mật khẩu liên tiếp 5 lần với body:
   ```json
   { "username": "admin", "password": "WrongPassword999" }
   ```
2. **Từ lần 1 đến lần 4**: Trả về `401 Unauthorized` ("Sai tên đăng nhập hoặc mật khẩu").
3. **Tại lần thứ 5**: Trả về `401 Unauthorized` kèm thông báo:
   ```json
   {
     "success": false,
     "message": "Tài khoản đã bị tạm khóa 15 phút do nhập sai mật khẩu 5 lần liên tiếp",
     "statusCode": 401
   }
   ```
4. **Kiểm tra khi đã bị khóa**: Nhập lại đúng mật khẩu `Admin@123` ngay sau đó -> Vẫn bị chặn `401 Unauthorized` kèm thông báo còn thời gian khóa.

---

### Chức năng 3: Đăng xuất & Thu hồi Token Blacklist

API đưa JWT hiện tại vào danh sách đen (Blacklist băm SHA-256 trong Database `revoked_tokens`) cho tới khi token hết hạn tự nhiên.

#### Bước 3.1: Đăng xuất
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/logout`
- **Headers**:
  ```http
  Authorization: Bearer {{accessToken}}
  ```
- **Response Kỳ Vọng**:
  - **HTTP Status**: `200 OK`
  - Body:
    ```json
    {
      "success": true,
      "message": "Đăng xuất thành công",
      "statusCode": 200
    }
    ```

#### Bước 3.2: Xác minh Token đã bị vô hiệu hóa
Dùng chính token vừa đăng xuất gửi yêu cầu lấy thông tin cá nhân:
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/auth/me`
- **Headers**:
  ```http
  Authorization: Bearer {{accessToken}}
  ```
- **Kỳ vọng**: `401 Unauthorized` ("Token đã bị thu hồi hoặc không hợp lệ"). Điều này chứng minh token đã bị chặn hoàn toàn ở tầng JwtFilter.

---

### Chức năng 4: Quên mật khẩu & Kiểm tra Token

Quy trình 2 bước: Yêu cầu mã khôi phục và kiểm tra tính hợp lệ của token trước khi người dùng đổi mật khẩu.

#### Bước 4.1: Gửi yêu cầu quên mật khẩu
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/forgot-password/initiate`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Body**:
  ```json
  {
    "contactInfo": "admin@example.com"
  }
  ```
- **Kỳ vọng**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Nếu tài khoản tồn tại, email hướng dẫn đã được gửi. Vui lòng kiểm tra hộp thư.",
    "statusCode": 200
  }
  ```
> 💡 **Cách lấy Token trong môi trường Dev**:
> Mở cửa sổ Terminal đang chạy Backend, bạn sẽ thấy dòng log in token rõ ràng:
> `[AUTH] Đã tạo Password Reset Token cho user admin@example.com: 2c54697a-7888-4e04-a50d-083cf3cad3b9`
> Copy chuỗi UUID này gán vào biến `{{resetToken}}` trong Postman.

#### Bước 4.2: Kiểm tra token trước khi hiển thị form (Pre-validation)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/auth/forgot-password/verify-token?token={{resetToken}}`
- **Kỳ vọng (Khi token hợp lệ)**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "valid": true,
      "message": "Token hợp lệ",
      "email": "admin@example.com"
    },
    "message": "Success",
    "statusCode": 200
  }
  ```
- **Kỳ vọng (Khi truyền token rác hoặc sai)**: `200 OK` với `valid: false` ("Token không tồn tại hoặc không hợp lệ").

---

### Chức năng 5: Đặt lại mật khẩu (Complete Forgot Password)

Dùng token vừa nhận để đặt mật khẩu mới cho tài khoản.

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/forgot-password/complete`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Body**:
  ```json
  {
    "resetToken": "{{resetToken}}",
    "newPassword": "Admin@NewPass123",
    "confirmNewPassword": "Admin@NewPass123"
  }
  ```

#### ✅ Kỳ vọng (Happy Case):
- **HTTP Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Đặt lại mật khẩu thành công",
    "statusCode": 200
  }
  ```
- **Hệ quả bảo mật**: Token sẽ bị đánh dấu `used = true` và các bộ đếm khóa brute-force trước đó được giải phóng về `0`.

#### ❌ Test Cases Kiểm Tra Biên:
1. **Dùng lại token vừa đặt**: Gửi lại request trên với cùng `resetToken` -> Kỳ vọng `400 Bad Request` ("Token đã được sử dụng hoặc đã hết hạn").
2. **Mật khẩu xác nhận không khớp**: Đổi `confirmNewPassword` khác `newPassword` -> Kỳ vọng `400 Bad Request` ("Mật khẩu xác nhận không khớp").

---

### Chức năng 6: Đổi mật khẩu (Change Password)

Dành cho người dùng đã đăng nhập đổi mật khẩu định kỳ trong phần Cài đặt tài khoản.

- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/change-password`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer {{adminToken}}
  ```
- **Body**:
  ```json
  {
    "oldPassword": "Admin@NewPass123",
    "newPassword": "Admin@123",
    "confirmNewPassword": "Admin@123"
  }
  ```

#### ✅ Kỳ vọng (Happy Case):
- **HTTP Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Đổi mật khẩu thành công",
    "statusCode": 200
  }
  ```

#### ❌ Test Cases Ngoại Lệ:
1. **Sai mật khẩu cũ**: Điền `oldPassword: "SaiMatKhau123"` -> Kỳ vọng `400 Bad Request` ("Mật khẩu cũ không chính xác").
2. **Trùng mật khẩu cũ**: Điền `newPassword` giống y hệt `oldPassword` -> Kỳ vọng `400 Bad Request` ("Mật khẩu mới không được trùng với mật khẩu hiện tại").

---

### Chức năng 7: Xác minh email (Verify Email - JSON & Redirect)

Hỗ trợ 2 chuẩn tiếp nhận: Redirect 302 cho người dùng click từ Email và JSON REST API cho SPA / Mobile App.

#### Bước 7.1: Gửi lại mã xác minh
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/resend-verification`
- **Body**:
  ```json
  {
    "contactInfo": "nexspace305@gmail.com"
  }
  ```
- **Lấy Token**: Quan sát terminal Backend để lấy `verifyToken`:
  `[AUTH] Đã tạo Email Verification Token cho user nexspace305@gmail.com: <uuid>`

#### Bước 7.2 (Cách 1): Xác minh qua JSON API trực tiếp
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/verify-email`
- **Body**:
  ```json
  {
    "token": "{{verifyToken}}"
  }
  ```
- **Kỳ vọng**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Xác thực email thành công",
    "statusCode": 200
  }
  ```

#### Bước 7.3 (Cách 2): Xác minh qua Browser / Redirect URL
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/auth/verify-email?token={{verifyToken}}`
- **Kỳ vọng**: HTTP `302 Found` (Redirect tới URL Frontend `{clientUrl}/email/verify-success`).

---

### Chức năng 8: Khóa & Mở khóa tài khoản (Admin Lock/Unlock - BR-31)

Chức năng Quản trị viên quản lý vòng đời tài khoản, bắt buộc ghi chú lý do (`reason`) và tự động ghi vết Kiểm toán (Audit Trail) theo chuẩn BR-31.

#### Bước 8.1: Khóa tài khoản
- **Method**: `PATCH`
- **URL**: `{{baseUrl}}/api/admin/users/{{testUserId}}/status`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer {{adminToken}}
  ```
- **Body**:
  ```json
  {
    "status": "LOCKED",
    "reason": "Phát hiện hành vi gian lận thanh toán và vi phạm chính sách"
  }
  ```
- **Kỳ vọng**: `200 OK` với `status: "LOCKED"`.

#### 🧪 Kiểm chứng hành vi bị khóa:
Dùng tài khoản vừa bị khóa gọi `POST /api/auth/login` -> Hệ thống lập tức trả về:
```json
{
  "success": false,
  "message": "Tài khoản đã bị khóa bởi Quản trị viên",
  "statusCode": 401
}
```

#### Bước 8.2: Mở khóa tài khoản
- **Method**: `PATCH`
- **URL**: `{{baseUrl}}/api/admin/users/{{testUserId}}/status`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer {{adminToken}}
  ```
- **Body**:
  ```json
  {
    "status": "ACTIVE",
    "reason": "Người dùng đã gửi đơn giải trình và hoàn tất xác minh danh tính"
  }
  ```
- **Kỳ vọng**: `200 OK` với `status: "ACTIVE"`.
- **Hệ quả**: Bộ đếm đăng nhập sai và thời gian tạm khóa brute-force tự động được reset về ban đầu. Người dùng đăng nhập lại thành công.

---

## 5. Bảng Mã Trạng Thái HTTP & Lỗi Phổ Biến

| Mã HTTP | Ý Nghĩa Trong NexSpace | Nguyên Nhân Thường Gặp |
| :--- | :--- | :--- |
| **`200 OK`** | Thành công | Đăng nhập, đổi mật khẩu, xác minh token thành công |
| **`201 Created`** | Tạo mới thành công | Đăng ký tài khoản mới thành công |
| **`302 Found`** | Chuyển hướng URL | Endpoint xác thực email qua link Web |
| **`400 Bad Request`** | Sai tham số / logic | Mật khẩu xác nhận không khớp, token đã dùng, validation lỗi |
| **`401 Unauthorized`** | Chưa xác thực / Bị chặn | Sai mật khẩu, token bị thu hồi (Blacklist), tài khoản bị khóa, brute-force |
| **`403 Forbidden`** | Không đủ quyền hạn | Tài khoản role `USER` cố gọi API của `ADMIN` |
| **`409 Conflict`** | Xung đột dữ liệu | Đăng ký với Email hoặc Username đã tồn tại |

---
*Tài liệu được cập nhật và kiểm thử tự động trên NexSpace Backend Spring Boot 3.5 & Frontend React 19.*
