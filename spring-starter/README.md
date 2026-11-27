# spring-starter

Spring Boot 3.5 / Java 17 starter: JWT auth, MySQL (JPA), Swagger, response envelope + global error handling.

## Chạy local

```bash
cp src/main/resources/application-local.properties.example src/main/resources/application-local.properties
# điền DB / JWT secret / mật khẩu admin
./mvnw spring-boot:run
```

- Swagger UI: http://localhost:8080/swagger-ui.html
- The default `local` profile includes the bundled Organizer agreement and stores generated PDFs under `${user.home}/.nexspace/organizer-contracts`. No machine-specific template or Cloudinary account is required for this agreement. Configure SMTP to deliver signing OTPs. Older local configuration files that explicitly set `app.organizer.contract.demo-enabled=false` must remove that override or set it to `true`. Production profiles continue to require the managed agreement and platform legal identity; Local demo agreements cannot be signed there.
- Lần chạy đầu: Flyway tự động chạy migration (`src/main/resources/db/migration/V1__init_schema.sql`). Để nạp dữ liệu mẫu (Master + Accounts + Workspaces + Bookings), chạy `python3 scripts/db/init_data.py` (xem chi tiết tại [scripts/db/README.md](scripts/db/README.md)).

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

## Organizer identity photo OCR

For organizer agreements, deployment configuration and private PDF storage, see [Organizer OTP agreements](docs/organizer-contracts.md).

The backend uses Tesseract with the `vie` and `eng` language packs. The backend Docker image installs and checks both packs at build time. For a native Maven run, install Tesseract and both language packs once on the host.

Windows detects the standard Program Files installation and can pick up both language files from `%LOCALAPPDATA%\NexSpace\tessdata`. Other installations can use `tesseract` on `PATH` and the standard language directory. Set `OCR_TESSERACT_COMMAND` to the executable or `OCR_TESSDATA_DIR` to the directory containing both `.traineddata` files to override discovery. The language directory can also be set using Tesseract's `TESSDATA_PREFIX`.

### macOS local setup

From `spring-starter/`, run `bash scripts/setup-local-macos.sh --install-ocr` after installing Homebrew. Omit `--install-ocr` to check an existing installation without installing anything. Apple Silicon (`/opt/homebrew`) and Intel (`/usr/local`) installations are detected, including when an IDE starts Java without Homebrew on PATH.

The helper creates `src/main/resources/application-local.properties` from the committed `.example` only if it does not exist. Configure your own database, JWT/bank encryption keys, SMTP and private Cloudinary credentials there; the helper never copies another developer's credentials or overwrites an existing config. Both local config and `.local-ocr.env` are gitignored. Run `source .local-ocr.env` and `./mvnw spring-boot:run -Dspring-boot.run.profiles=local` in the same terminal. IDE users may set the two OCR environment variables in their run configuration; standard Homebrew locations are also discovered automatically.

Unreadable-photo errors suggest focus, glare and crop corrections without claiming that OCR proved a specific visual defect. Missing tools/languages, overload and timeouts are reported separately from image quality. OCR classifies document sides; it does not establish identity authenticity.

## Docker

```bash
cp .env.example .env   # điền giá trị
docker compose up -d --build
```
