# spring-starter

Spring Boot 3.5 / Java 17 starter: JWT auth, MySQL (JPA), Swagger, response envelope + global error handling.

## Chạy local

```bash
cp src/main/resources/application-local.properties.example src/main/resources/application-local.properties
# điền DB / JWT secret / mật khẩu admin
./mvnw spring-boot:run
```

- Swagger UI: http://localhost:8080/swagger-ui.html
- Lần chạy đầu: Hibernate tự tạo bảng (`ddl-auto=update`), `DataInitializer` seed role `ADMIN`, `USER` và tài khoản admin (`app.seed.admin.*`).

## Cấu trúc

```
base.api
├── ApiApplication
├── feature/<module>/          # mỗi nghiệp vụ một package
│   ├── controller/
│   ├── dto/{request,response}/
│   ├── mapper/
│   ├── repository/
│   └── service/{I*Service, impl/}
└── shared/
    ├── base/        BaseAPIController (success/created/successPage, getCurrentUserId)
    ├── config/      Security, JWT filter, OpenAPI, async, email, data seed
    ├── dto/         ApiResponse, PageRequestDTO, PageResponseDTO
    ├── entity/      BaseModel (id, createdAt, updatedAt) + entity
    ├── enums/
    ├── exception/   *Exception + GlobalExceptionHandler
    ├── security/    AuthUser (principal), CurrentUserProvider
    └── util/
```

Thêm module mới: tạo `feature/<tên>/...` theo đúng mẫu `feature/auth`, controller `extends BaseAPIController`,
ném `BadRequestException` / `NotFoundException` / `ConflictException`... để handler trả response chuẩn.
Quy tắc đầy đủ khi viết API mới (kèm code mẫu + checklist): xem [API_RULES.md](API_RULES.md).

## API mẫu (feature/auth)

| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/login` | public |
| POST | `/api/auth/register` | public |
| GET  | `/api/auth/verify-email?token=` | public |
| POST | `/api/auth/resend-verification` | public |
| POST | `/api/auth/forgot-password/initiate` | public |
| POST | `/api/auth/forgot-password/complete` | public |
| POST | `/api/auth/logout` | JWT |
| GET / PUT | `/api/auth/me` | JWT |
| POST | `/api/auth/change-password` | JWT |
| GET | `/api/admin/users` | ADMIN |
| GET | `/api/admin/users/{id}` | ADMIN |
| PATCH | `/api/admin/users/{id}/status` | ADMIN |

Response luôn có dạng:

```json
{ "success": true, "data": { ... }, "message": "...", "statusCode": 200 }
```

## Cấu hình chính

| Property | Env | Mặc định |
|---|---|---|
| `spring.datasource.*` | `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | — |
| `app.jwt.secret` | `JWT_SECRET` | — (bắt buộc, ≥ 32 bytes) |
| `app.jwt.expiration-ms` | `JWT_EXPIRATION_MS` | 1 ngày |
| `app.auth.email-verification-enabled` | `EMAIL_VERIFICATION_ENABLED` | `false` |
| `app.client-url` | `CLIENT_URL` | `http://localhost:5173` |
| `app.cors.allowed-origins` | `CORS_ALLOWED_ORIGINS` | (localhost:* luôn được phép) |
| `spring.mail.username/password` | `MAIL_USERNAME`, `MAIL_PASSWORD` | — (trống = bỏ qua gửi mail) |

## Docker

```bash
cp .env.example .env   # điền giá trị
docker compose up -d --build
```
