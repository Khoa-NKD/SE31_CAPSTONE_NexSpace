# NexSpace Database Migration & Python Seeding Toolkit

Bộ công cụ quản lý **Database Schema Migration (Flyway)** và **Python Data Seeding / Cleanup Scripts** cho dự án **NexSpace Backend (`spring-starter`)**.

---

## 1. Cấu trúc thư mục

```text
spring-starter/
├── src/main/resources/
│   └── db/migration/
│       └── V1__init_schema.sql        # Flyway Migration V1: Khởi tạo toàn bộ 44 bảng + Master Roles/BusinessType
└── scripts/
    └── db/
        ├── README.md                  # Tài liệu hướng dẫn sử dụng (file này)
        ├── requirements.txt           # Thư viện Python tùy chọn (PyMySQL, cryptography, bcrypt)
        ├── db_helper.py               # Tự động đọc application-local.properties, kết nối MySQL/Docker, mã hóa BCrypt & AES-GCM
        ├── make_migration.py          # Tự động so sánh cấu trúc DB hiện tại với db/migration/ để sinh file V2, V3...sql mới
        ├── seed_master_data.py        # Seed riêng các bảng Master (roles, business_type, amenity, platform_setting, notification_template)
        ├── seed_accounts.py           # Seed tài khoản mẫu (Admin, Organizer, Applicant, Customer) + hồ sơ pháp lý KYC
        ├── init_data.py               # Script tổng hợp: Seed đầy đủ Master + Accounts + Workspaces + Floor Plans + Bookings + Payments
        └── clear_data.py              # Script dọn dẹp / reset dữ liệu trong Database (giữ nguyên cấu trúc bảng)
```

---

## 2. Cơ chế Database Migration (Flyway)

Khi khởi chạy Spring Boot (`./mvnw spring-boot:run`), **Flyway** sẽ tự động:
1. Kiểm tra bảng lịch sử `flyway_schema_history`.
2. Nếu database mới hoàn toàn hoặc chưa có đủ bảng, Flyway thực thi [`V1__init_schema.sql`](../../src/main/resources/db/migration/V1__init_schema.sql) để khởi tạo toàn bộ **44 bảng** thuộc 10 phân hệ (`Identity`, `Organizer`, `Workspace`, `Resource`, `Pricing`, `Booking`, `Payment`, `Review`, `Personalization`, `Governance`).
3. Nếu database đã có sẵn bảng từ trước (`baseline-on-migrate=true`, `baseline-version=0`), Flyway vẫn chạy an toàn nhờ cơ chế `CREATE TABLE IF NOT EXISTS` và `INSERT IGNORE`.

### Cách tự động sinh file Migration mới khi thêm/sửa bảng hoặc cột (`make_migration.py`)

Khi bạn thêm `@Column`, `@Entity` mới trong Java (để Hibernate `ddl-auto=update` tự cập nhật vào DB local) hoặc chỉnh sửa cấu trúc bảng trực tiếp trên MySQL, bạn **không cần tự gõ tay file SQL** mà chỉ cần chạy lệnh:

```bash
# 1. Tự động phát hiện bảng/cột mới trong DB và sinh file V2__<ten_tu_dong>.sql (chỉ lấy cấu trúc, không lấy dữ liệu)
python3 spring-starter/scripts/db/make_migration.py

# 2. Hoặc đặt tên mô tả tùy ý cho file migration
python3 spring-starter/scripts/db/make_migration.py -m "add_checkin_note_to_booking"

# 3. Xem trước câu lệnh SQL khác biệt trên màn hình mà chưa tạo file (--dry-run)
python3 spring-starter/scripts/db/make_migration.py --dry-run

# 4. Nếu có xóa cột/bảng trên DB và muốn đưa cả lệnh DROP vào file migration
python3 spring-starter/scripts/db/make_migration.py --include-drops -m "drop_legacy_column"
```

Script `make_migration.py` sẽ tự động đối chiếu `SHOW CREATE TABLE` của toàn bộ DB hiện tại với lịch sử các file `V1`, `V2`... trong `src/main/resources/db/migration/` và tự động sinh ra file tiếp theo (`V2__...sql`, `V3__...sql`).

---

## 3. Hướng dẫn sử dụng các Script Python

> **Lưu ý:** Bộ script trong `scripts/db/` được thiết kế **Zero-Setup**:
> - Tự động đọc thông tin kết nối (`spring.datasource.url`, `username`, `password`, `app.seed.admin.password`, `app.organizer.bank.encryption-key`) từ `spring-starter/src/main/resources/application-local.properties` hoặc biến môi trường.
> - Hoạt động ngay lập tức kể cả khi máy chưa cài `PyMySQL` (tự động fallback sang `mysql` CLI hoặc `docker exec -i nexspace-mysql mysql --default-character-set=utf8mb4`).
> - Nếu muốn chạy qua driver Python thuần, có thể cài đặt:
>   ```bash
>   pip install -r spring-starter/scripts/db/requirements.txt
>   ```

### 3.1. Khởi tạo đầy đủ dữ liệu chuẩn nghiệp vụ (`init_data.py`)

Từ thư mục gốc worktree (hoặc `spring-starter/`), chạy:

```bash
# Nạp đầy đủ dữ liệu (Master + Tài khoản + Workspaces + Sơ đồ tầng + Đặt chỗ + Thanh toán + Đánh giá)
python3 spring-starter/scripts/db/init_data.py

# Xóa sạch dữ liệu cũ (rác test) trước rồi nạp lại bộ dữ liệu chuẩn từ đầu (Khuyên dùng!)
python3 spring-starter/scripts/db/init_data.py --clear-first

# Chỉ nạp bảng Master Catalog + Tài khoản cơ bản (không tạo sẵn Workspace/Booking mẫu)
python3 spring-starter/scripts/db/init_data.py --mode master
```

### 3.2. Chỉ nạp dữ liệu Master hoặc Tài khoản riêng lẻ

```bash
# Chỉ seed 5 bảng Master (roles, business_type, amenity, platform_setting, notification_template)
python3 spring-starter/scripts/db/seed_master_data.py

# Chỉ seed tài khoản (Admin, Organizer, Customer) & hồ sơ KYC mẫu
python3 spring-starter/scripts/db/seed_accounts.py
```

### 3.3. Xóa / Làm sạch dữ liệu trong Database (`clear_data.py`)

```bash
# 1. Xóa sạch dữ liệu của toàn bộ 44 bảng nghiệp vụ, reset AUTO_INCREMENT = 1 (giữ nguyên cấu trúc bảng)
python3 spring-starter/scripts/db/clear_data.py --yes

# 2. Xóa dữ liệu giao dịch (Workspaces, Bookings, Payments...) nhưng GIỮ LẠI các bảng Master
python3 spring-starter/scripts/db/clear_data.py --mode keep-master --yes

# 3. Xóa dữ liệu giao dịch nhưng GIỮ LẠI cả bảng Master VÀ danh sách Tài khoản (users, organizer_profile)
python3 spring-starter/scripts/db/clear_data.py --mode keep-master --keep-accounts --yes

# 4. Drop toàn bộ bảng và chạy lại V1__init_schema.sql mới tinh từ đầu
python3 spring-starter/scripts/db/clear_data.py --mode drop-all --recreate-schema --yes
```

---

## 4. Danh sách Tài khoản & Dữ liệu Nghiệp vụ được khởi tạo

### 4.1. Tài khoản đăng nhập mẫu (`users`)

| Vai trò | Email đăng nhập | Username | Mật khẩu mặc định | Trạng thái Hồ sơ / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@nexspace.vn` | `admin` | *(theo `app.seed.admin.password` hoặc `Admin@123456`)* | Quản trị viên cao cấp hệ thống |
| **ADMIN** | `ops.admin@nexspace.vn` | `admin.ops` | *(theo `app.seed.admin.password` hoặc `Admin@123456`)* | Quản trị viên vận hành & duyệt KYC |
| **ORGANIZER** | `organizer@nexspace.vn` | `organizer` | *(theo `app.seed.organizer.password` hoặc `Organizer@123456`)* | **APPROVED** — *Công ty CP Không Gian Làm Việc NexSpace Việt Nam* (MST `0316889901`, Vietcombank `****6868`) |
| **ORGANIZER** | `partner.toong@nexspace.vn` | `toong.partner` | *(theo `app.seed.organizer.password` hoặc `Organizer@123456`)* | **APPROVED** — *Công ty CP Đầu Tư Không Gian Sáng Tạo Đông Dương - Toong* (MST `0106998812`, Techcombank `****8899`) |
| **APPLICANT** | `partner.dreamplex@nexspace.vn` | `dreamplex.partner` | `Organizer@123456` | **PENDING_REVIEW** — *Công ty TNHH Dreamplex Coworking Sài Gòn* (Dùng để test duyệt hồ sơ KYC bên Admin A04) |
| **APPLICANT** | `partner.thinkspace@nexspace.vn` | `thinkspace.partner` | `Organizer@123456` | **REVISION_REQUESTED** — *Hộ Kinh Doanh ThinkSpace Đà Nẵng* (Dùng để test luồng nộp bổ sung CCCD bên Organizer O04) |
| **CUSTOMER** | `customer@nexspace.vn` | `customer` | `Customer@123456` | Khách hàng cá nhân (Mai Đăng Huy) — Đã có gói hội viên Flex Pass & lịch sử đặt chỗ |
| **CUSTOMER** | `khoa.nguyen@nexspace.vn` | `khoa.nguyen` | `Customer@123456` | Khách hàng doanh nghiệp (Nguyễn Kim Đăng Khoa) |
| **CUSTOMER** | `vu.nguyen@nexspace.vn` | `vu.nguyen` | `Customer@123456` | Khách hàng cá nhân (Nguyễn Huy Vũ) — Đã có đơn hủy & hoàn tiền |
| **CUSTOMER** | `lan.tran@nexspace.vn` | `lan.tran` | `Customer@123456` | Khách hàng cá nhân (Trần Ngọc Lan) |

### 4.2. Dữ liệu Master & Nghiệp vụ (`full` mode)

- **Master Catalog:**
  - `roles`: 3 vai trò (`ADMIN`, `USER`, `ORGANIZER`).
  - `business_type`: 5 loại hình doanh nghiệp song ngữ Việt/Anh (`JOINT_STOCK`, `LIMITED_LIABILITY`, `SOLE_PROPRIETOR`, `HOUSEHOLD_BUSINESS`, `OTHER`).
  - `amenity`: 15 tiện ích tiêu chuẩn chia theo 3 nhóm `TECH`, `SPACE`, `COMFORT`.
  - `platform_setting`: 14 cấu hình vận hành hệ thống (hoa hồng sàn 10%, VAT 8%, phí dịch vụ 2.5%, thời gian giữ chỗ 15 phút, giới hạn upload 5MB...).
  - `notification_template`: 8 mẫu thông báo song ngữ (`EMAIL`, `IN_APP`).
- **Tòa nhà, Không gian & Sơ đồ tầng 2D (`building`, `workspace`, `floor_plan`, `bookable_resource`):**
  - 3 tòa nhà tại **Đà Nẵng**, **TP. Hồ Chí Minh**, **Hà Nội** với 4 tầng vật lý (`building_floor`).
  - 6 không gian làm việc (`workspace`) có tọa độ GPS thực tế phục vụ tìm kiếm bản đồ `Nearby`:
    1. *NexSpace Executive Hub Hải Châu* (Đà Nẵng — `ACTIVE`)
    2. *NexSpace Sky Lounge & Studios Sơn Trà* (Đà Nẵng — `ACTIVE`)
    3. *NexSpace Saigon Prime Center Quận 1* (TP.HCM — `ACTIVE`)
    4. *Toong Tràng Thi Heritage Coworking* (Hà Nội — `ACTIVE`)
    5. *NexSpace Tech Park Cẩm Lệ* (Đà Nẵng — `PENDING_REVIEW`, chờ Admin duyệt)
    6. *Toong Thảo Điền Garden Studio* (TP.HCM — `DRAFT`, bản nháp của Organizer)
  - 10 loại tài nguyên (`resource_type`) và 15 vị trí đặt chỗ (`bookable_resource`) bao gồm bàn lẻ, phòng họp lớn và ghế thành viên gắn với phòng họp (`parent_room_id`).
- **Đặt chỗ, Thanh toán, Đối soát & Đánh giá:**
  - 4 đơn đặt chỗ (`booking`) ở các trạng thái `COMPLETED`, `CONFIRMED`, `CANCELLED` kèm giao dịch thanh toán PayOS (`payment_transaction`), giải ngân đối tác (`organizer_payout`), hoàn tiền (`refund_request`), đánh giá 5 sao (`customer_review`), khiếu nại hỗ trợ (`support_case`) và nhật ký kiểm toán (`audit_log`).
