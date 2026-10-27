# NexSpace Backend

Spring Boot 3.5.0 · Java 21 LTS · Maven · Spring Security/JWT · MySQL 8.4 · Flyway 11.20.3.
Swagger dùng springdoc 2.8.9. Maven, `.java-version`, CI và Docker thống nhất Java 21.
Cập nhật bản vá trong dòng Java 21 khi có bản mới. IDE Project SDK và `./mvnw -v` phải dùng JDK 21.

## Trạng thái và cấu trúc

Auth đã dùng UUID, các bảng v3.3 và vai trò Customer/Organizer/Administrator.
Flyway tạo schema; Hibernate `validate` kiểm tra mapping trước khi ứng dụng phục vụ request.
Các module nghiệp vụ còn lại hiện là khung thư mục, chưa có API.

```text
spring-starter/
├── pom.xml / mvnw / mvnw.cmd / .java-version
├── Dockerfile / docker-compose.yml / .env.example
├── scripts/
│   ├── verify-migration.py       # MySQL tạm + migration + HTTP smoke test
│   └── verify-backend.py         # Kiểm tra JAR; được gọi từ script trên
└── src/
    ├── main/
    │   ├── java/base/api/
    │   │   ├── ApiApplication.java
    │   │   ├── feature/auth/     # controller, dto, mapper, repository, service
    │   │   ├── feature/...       # Các module ở bảng dưới
    │   │   ├── integration/      # payos, cloudinary, ai: chưa triển khai
    │   │   └── shared/           # config, dto, entity, enums, exception, security, util
    │   └── resources/
    │       ├── application.yml
    │       ├── application-prod.yml
    │       ├── application-local.yml.example
    │       └── db/migration/V1__init_nexspace_v3_3.sql
    └── test/
        ├── java/base/api/...
        └── resources/application-test.yml
```

Module mới giữ cấu trúc `controller`, `dto/request`, `dto/response`, `entity`, `enums`,
`mapper`, `repository`, `service/impl`. Package gốc `base.api` được giữ để tương thích starter.
Entity auth và converter đang nằm trong `shared/entity` theo cấu trúc ban đầu.

## Phạm vi các module dự kiến

| Module | Trách nhiệm dự kiến |
| --- | --- |
| `organizer` | Hồ sơ đơn vị vận hành, đăng ký và xét duyệt Organizer. |
| `workspace` | Thông tin không gian, địa chỉ, tiện ích, media và vòng đời xét duyệt/vận hành. |
| `floorplan` | Tầng, sơ đồ mặt bằng và bố trí không gian. |
| `resource` | Ghế, phòng, khu vực và trạng thái tài nguyên. |
| `availability` | Lịch trống, khung giờ và khóa lịch theo ràng buộc booking. |
| `booking` | Đặt chỗ, đổi/hủy lịch và check-in/check-out bằng QR. |
| `pricing` | Giá cơ bản, quy tắc giá và ưu đãi. |
| `membership` | Gói thành viên, đăng ký gói và quyền lợi sử dụng. |
| `payment` | Giao dịch thanh toán và xử lý kết quả/webhook thanh toán. |
| `refund` | Yêu cầu hoàn tiền và quá trình xét duyệt/xử lý. |
| `payout` | Phí nền tảng, đối soát và chi trả cho Organizer. |
| `review` | Đánh giá không gian, phản hồi và kiểm duyệt đánh giá. |
| `dispute` | Báo cáo vi phạm, khiếu nại, tranh chấp và bằng chứng. |
| `notification` | Thông báo và trạng thái đọc của người nhận. |
| `favorite` | Danh sách không gian yêu thích của Customer. |
| `analytics` | Số liệu dashboard và báo cáo theo phạm vi được phép. |

Phân chia này là khung tổ chức mã theo phạm vi tính năng đã mô tả trong `sys/README.md`.
Khi triển khai, đối chiếu SRS/SDD và thiết kế database hiện hành trong `Code/docs/`;
khung thư mục không bổ sung yêu cầu, tên bảng, endpoint hay quy tắc tài chính mới.

## Chạy local

Cần JDK 21, Python 3 (chạy script kiểm tra) và Docker đang hoạt động.

```bash
cd /Users/huymd/Documents/NexSpace/Code/spring-starter
cp .env.example .env
# Điền MYSQL_PASSWORD và MYSQL_ROOT_PASSWORD; DB_PASSWORD = MYSQL_PASSWORD.
# DB_USERNAME = MYSQL_USER. Những giá trị DB_* này dành cho backend trong Docker.
docker compose up -d mysql
cp src/main/resources/application-local.yml.example src/main/resources/application-local.yml
# Điền DB password và JWT secret trong application-local.yml.
./mvnw spring-boot:run
```

Local dùng MySQL ở `localhost:3307`; Docker backend dùng `mysql:3306`.
`SERVER_PORT` (mặc định 8080) đồng bộ cổng ứng dụng, port mapping của Compose và
healthcheck Docker; khi đổi cổng, cập nhật `API_URL` tương ứng.
Không commit `.env` hoặc `application-local.yml`; Docker build cũng loại bỏ chúng.
JWT secret cần ít nhất 32 byte ngẫu nhiên, không dùng giá trị placeholder trong file mẫu.

## Các môi trường

| Profile | Cấu hình và hành vi |
| --- | --- |
| `local` (mặc định) | Dùng cấu hình chung, tùy chỉnh bằng `application-local.yml` được gitignore; CORS mặc định `http://localhost:3000`; Swagger bật; email verification mặc định tắt để phát triển không cần SMTP. |
| `test` | H2 trong bộ nhớ, Hibernate `create-drop`, Flyway tắt cho test HTTP/Swagger; email được mock trong test xác minh/reset. |
| `prod` | `application-prod.yml`; yêu cầu DB URL/user/password, JWT, CLIENT_URL, API_URL, CORS_ALLOWED_ORIGINS. Email verification mặc định bật và yêu cầu MAIL_USERNAME/MAIL_PASSWORD. Swagger mặc định tắt. |

Đổi profile bằng `SPRING_PROFILES_ACTIVE=prod` hoặc `--spring.profiles.active=prod`.
Ứng dụng không tự đọc `.env` khi chạy từ Maven/IDE; Docker Compose nạp file này.
`RuntimeSettingsValidator` kiểm tra cấu hình prod bắt buộc và các thời hạn phải dương.
`SEED_ADMIN_ENABLED` mặc định false. Chỉ bật khi muốn tạo admin đầu tiên, đồng thời cung cấp
`SEED_ADMIN_EMAIL` và `SEED_ADMIN_PASSWORD`. Không tự nâng quyền tài khoản đã có cùng email.

## Hợp đồng API

Prefix chuẩn: **`/api/v1`**. ID là chuỗi UUID chuẩn, không còn ID số hoặc username riêng.
`fullName` lưu họ tên đầy đủ theo schema; tài khoản đăng nhập bằng email.
Role JSON/database: `Customer`, `Organizer`, `Administrator`; trạng thái:
`Unverified`, `Active`, `Locked`, `Deactivated`.

Response thành công:

```json
{"success":true,"data":{},"message":"Success","timestamp":"2026-10-27T00:00:00Z","requestId":"example-123"}
```

Response lỗi của controller và Spring Security dùng chung định dạng:

```json
{"success":false,"status":400,"error":"Bad Request","message":"Dữ liệu nhập không hợp lệ","path":"/api/v1/auth/register","timestamp":"2026-10-27T00:00:00Z","requestId":"example-123","validationErrors":{"email":"must be a well-formed email address"}}
```

`validationErrors` chỉ có khi cần. Phân trang dùng `data.content`, `page` bắt đầu từ **0**,
`size`, `totalElements`, `totalPages`, `first`, `last`, `empty`.
Tham số ví dụ: `?page=0&size=20&sort=createdAt,desc&search=alice`; size tối đa 100.

| Method | Endpoint dưới `/api/v1` | Quyền |
| --- | --- | --- |
| POST | `/auth/register` | Public; chỉ tạo Customer |
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Public; cần refreshToken hợp lệ |
| GET | `/auth/verify-email?token=...` | Public; redirect kết quả |
| POST | `/auth/resend-verification` | Public |
| POST | `/auth/forgot-password/initiate` | Public |
| POST | `/auth/forgot-password/complete` | Public |
| GET / PUT | `/auth/me` | JWT |
| POST | `/auth/change-password` | JWT; thu hồi mọi phiên |
| POST | `/auth/logout` | JWT; thu hồi phiên hiện tại |
| GET | `/admin/users` và `/admin/users/{uuid}` | Administrator |
| PATCH | `/admin/users/{uuid}/status` | Administrator |

Đăng ký nhận `email`, `password`, `fullName`, `phone` (tùy chọn).
Đăng nhập nhận `email`, `password`; alias `username` chỉ được hỗ trợ khi giá trị là email.
Refresh nhận `refreshToken`. Đổi mật khẩu nhận `oldPassword`, `newPassword`, `confirmNewPassword`.
Khởi tạo reset nhận `contactInfo` là email; hoàn tất nhận `resetToken`, `newPassword`, `confirmNewPassword`.
Profile cập nhật nhận `fullName`, `phone`, `birthDate`, `address`, `avatarUrl`.

JWT có UUID người dùng và UUID phiên `sid`. Access token mặc định 15 phút,
refresh session 30 ngày. Refresh token được xoay, giá trị cũ không dùng lại được.
Đổi/reset mật khẩu, khóa hoặc vô hiệu hóa tài khoản thu hồi các phiên tương ứng.
Refresh token và token xác minh/reset chỉ lưu hash SHA-256; challenge có hạn dùng,
được khóa khi tiêu thụ để ngăn dùng lại. Action tài khoản được ghi vào `log_audit_log`.
Các tài khoản bật 2FA chưa được cấp phiên bởi luồng đăng nhập mật khẩu hiện tại;
TOTP/OAuth và quyền động từ `cfg_role_permission` chưa triển khai.

## Swagger, health và log

- Swagger UI local: http://localhost:8080/swagger-ui.html
- OpenAPI JSON/YAML: `/v3/api-docs`, `/v3/api-docs.yaml`.
- Gọi login, lấy `data.accessToken`, bấm **Authorize** và dán token thuần.
- Prod chỉ bật Swagger khi đặt `SWAGGER_ENABLED=true`.
- Health: `/actuator/health`, `/actuator/health/liveness`, `/actuator/health/readiness`.
  Readiness kiểm tra database; health không công khai chi tiết. Docker dùng readiness.
- Chỉ health được expose; các endpoint quản trị Actuator khác bị chặn.
- Request có `X-Request-ID` hợp lệ sẽ được giữ lại; thiếu/sai định dạng sẽ sinh UUID mới.
  ID có trong response header, JSON thành công/lỗi và MDC log; cũng truyền sang tác vụ email.
- Log HTTP gồm method, path, status, thời gian; không ghi query string, body hoặc Authorization.
- CORS chỉ chấp nhận origin cấu hình, expose `X-Request-ID`; không mặc định cho phép mọi localhost.

## Flyway và MySQL

V1 từ `NexSpace_v3.3_MOCK_PROJECT_NEXSPACE.sql`, SHA-256 nguồn nằm trong header.
Giữ nguyên DDL: 47 bảng, 721 cột nghiệp vụ + 5 cột ảo, 103 FK, 30 trigger.
Chỉ bỏ `USE` cố định để JDBC URL chọn database. V1 không chứa seed data và không được sửa sau khi áp dụng.
Auth ánh xạ vào `m_app_user`, `t_user_session`, `t_user_verification_challenge`, `log_audit_log`;
không tạo các bảng legacy `users`, `roles` hoặc bảng token riêng.

```bash
export DB_URL='jdbc:mysql://localhost:3307/MOCK_PROJECT_NEXSPACE?allowPublicKeyRetrieval=true&useSSL=false&connectionTimeZone=UTC'
export DB_USERNAME='nexspace'
export DB_PASSWORD='<local database password>'
./mvnw -B flyway:migrate
./mvnw -B flyway:validate flyway:info
```

URL trên dành cho local. Plugin Maven nhận DB_* từ environment, không đọc YAML hoặc `.env`.
Ứng dụng tự migrate khi khởi động, rồi Hibernate validate. Flyway lưu lịch sử trong
`flyway_schema_history`; chạy lại không chạy lại V1. Migration tiếp theo đặt tên `V2__description.sql`.
`baseline-on-migrate=false`, `clean-disabled=true`; database đã import thủ công cần đối chiếu/baseline có kế hoạch.
MySQL DDL autocommit: khi lỗi giữa chừng, kiểm tra schema một phần trước khi xử lý; không tự repair/xóa bảng dùng chung.
Mọi connection ứng dụng và MySQL local dùng UTC.

Compose có volume `mysql-data`, MySQL healthcheck và backend chờ MySQL sẵn sàng.
Local bật `log_bin_trust_function_creators=ON` để tạo trigger khi binlog bật mà không cấp SUPER
cho user ứng dụng. MySQL môi trường khác cần cấu hình/quyền tạo trigger tương ứng.
Không mount V1 vào `docker-entrypoint-initdb.d`, tránh khởi tạo schema hai lần.

## Kiểm tra, format và CI

```bash
./mvnw -B spotless:apply        # Format Java theo google-java-format
./mvnw -B clean verify         # Kiểm tra format, build, unit/integration test H2
python3 scripts/verify-migration.py
# Kiểm tra toàn bộ Docker local sau khi điền .env:
docker compose up -d --build
```

Script MySQL kiểm tra image `mysql:8.4`, chỉ pull nếu thiếu; tạo container/database tạm
`nexspace_migration_*`, kiểm tra V1, chạy lại, checksum, khóa ngoại, CHECK/UNIQUE và trigger.
Sau đó chạy JAR thật với profile prod trên database đó, Hibernate validate và kiểm thử HTTP:
health, đăng ký/login UUID, phân quyền, phân trang, khóa tài khoản, refresh rotation, đổi mật khẩu, logout.
Smoke test tắt email verification và Swagger; kiểm thử verification/reset riêng dùng mail mock,
không xác nhận SMTP thực tế đã gửi email. Container tạm tự dọn, không dùng volume/database của dự án.
Test migration được skip trong `mvn verify` thường và được chạy bằng script trên.

Workflow tại `Code/.github/workflows/backend-ci.yml` (repo Git nằm ở `Code/`) dùng JDK 21,
chạy verify, script MySQL, build image Docker và lưu test reports cho PR có thay đổi backend.
Tạo workflow local không có nghĩa là GitHub Actions đã chạy; cần push/PR được phép riêng.

## Kết nối frontend

Transport đã khớp chuẩn `/api/v1`, error và pagination của frontend hiện tại.
Frontend vẫn dùng mock server cho các module; cấu hình khi chuyển API thực:
`VITE_API_PROXY_TARGET=http://localhost:8080`, `INTERNAL_API_URL=http://localhost:8080/api/v1`.
Không thay các ID mock `USR-*` bằng UUID trong UI một cách ngầm định; các adapter/domain cần được chuyển
khi tích hợp từng feature. Các màn hình còn dùng mock chưa được coi là đã kết nối backend.
