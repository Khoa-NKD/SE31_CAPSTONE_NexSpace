#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NexSpace Accounts & Organizer KYC Seeder (`seed_accounts.py`)
=============================================================
Seeds realistic system accounts (`users`), Organizer KYC profiles (`organizer_profile`,
`organizer_document` + local PDF files in `~/.nexspace/organizer-documents`), and
Customer Preferences (`customer_preference`) aligned with NexSpace business workflows:

1. Admin Accounts (`role_id = 1` ADMIN):
   - `admin@nexspace.vn`          (Username: `admin`, Password: `Admin@123456`)
   - `ops.admin@nexspace.vn`      (Username: `admin.ops`, Password: `Admin@123456`)

2. Organizer Accounts:
   - `organizer@nexspace.vn`      (Username: `organizer`, Password: `Organizer@123456`, Role: `ORGANIZER`, Profile: `APPROVED` — Công ty CP Không Gian Làm Việc NexSpace Việt Nam)
   - `partner.toong@nexspace.vn`  (Username: `toong.partner`, Password: `Organizer@123456`, Role: `ORGANIZER`, Profile: `APPROVED` — Công ty CP Đầu Tư Không Gian Sáng Tạo Đông Dương - Toong)
   - `partner.dreamplex@nexspace.vn` (Username: `dreamplex.partner`, Password: `Organizer@123456`, Role: `USER`, Profile: `PENDING_REVIEW` — Công ty TNHH Dreamplex Coworking Sài Gòn)
   - `partner.thinkspace@nexspace.vn` (Username: `thinkspace.partner`, Password: `Organizer@123456`, Role: `USER`, Profile: `REVISION_REQUESTED` — Hộ Kinh Doanh ThinkSpace Đà Nẵng)

3. Customer Accounts (`role_id = 2` USER):
   - `customer@nexspace.vn`       (Username: `customer`, Password: `Customer@123456` — Mai Đăng Huy)
   - `khoa.nguyen@nexspace.vn`    (Username: `khoa.nguyen`, Password: `Customer@123456` — Nguyễn Kim Đăng Khoa)
   - `vu.nguyen@nexspace.vn`      (Username: `vu.nguyen`, Password: `Customer@123456` — Nguyễn Huy Vũ)
   - `lan.tran@nexspace.vn`       (Username: `lan.tran`, Password: `Customer@123456` — Trần Ngọc Lan)

Usage:
  python3 spring-starter/scripts/db/seed_accounts.py
"""

from __future__ import annotations

from pathlib import Path
from db_helper import (
    DatabaseExecutor,
    DbConfig,
    bcrypt_hash,
    encrypt_bank_account,
    load_db_config,
    sql_literal,
)


def _ensure_local_sample_documents(doc_keys: list[str]) -> None:
    """Creates minimal valid PDF files in ~/.nexspace/organizer-documents for seeded KYC docs."""
    doc_dir = Path.home() / ".nexspace" / "organizer-documents"
    doc_dir.mkdir(parents=True, exist_ok=True)
    minimal_pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj\n"
        b"xref\n0 4\n0000000000 65535 f \n"
        b"trailer << /Root 1 0 R /Size 4 >>\n%%EOF\n"
    )
    for key in doc_keys:
        if key.endswith(".pdf"):
            target = doc_dir / key
            if not target.exists():
                target.write_bytes(minimal_pdf)
                try:
                    target.chmod(0o600)
                except Exception:
                    pass


def build_accounts_sql(cfg: DbConfig) -> str:
    admin_hash = bcrypt_hash(cfg.admin_password)
    org_hash = bcrypt_hash(cfg.organizer_password)
    cust_hash = bcrypt_hash(cfg.customer_password)

    # Encrypt bank account numbers using OrganizerBankAccountCipher format (`bank:v1:...`)
    bank_acc_1 = encrypt_bank_account(1, "0071001236868", cfg.bank_encryption_key)
    bank_acc_2 = encrypt_bank_account(2, "19036888998899", cfg.bank_encryption_key)
    bank_acc_3 = encrypt_bank_account(3, "889911223344", cfg.bank_encryption_key)
    bank_acc_4 = encrypt_bank_account(4, "0041009988776", cfg.bank_encryption_key)

    users = [
        # Admins (role_id = 1)
        (1, "admin", "admin@nexspace.vn", admin_hash, "Quản Trị", "Hệ Thống", "0901000001", "MALE", "1995-01-15", 1, "ACTIVE", True),
        (2, "admin.ops", "ops.admin@nexspace.vn", admin_hash, "Minh Đức", "Trần", "0901000002", "MALE", "1996-06-20", 1, "ACTIVE", True),
        # Organizers (Approved -> role_id = 3 ORGANIZER; Pending/Revision -> role_id = 2 USER per lifecycle rule)
        (3, "organizer", "organizer@nexspace.vn", org_hash, "Hoàng Nam", "Nguyễn", "0905123456", "MALE", "1990-03-12", 3, "ACTIVE", True),
        (4, "toong.partner", "partner.toong@nexspace.vn", org_hash, "Sơn Tùng", "Đỗ", "0903888999", "MALE", "1988-09-25", 3, "ACTIVE", True),
        (5, "dreamplex.partner", "partner.dreamplex@nexspace.vn", org_hash, "Bảo Trâm", "Lê", "0908777666", "FEMALE", "1992-11-08", 2, "ACTIVE", True),
        (6, "thinkspace.partner", "partner.thinkspace@nexspace.vn", org_hash, "Quốc Anh", "Phạm", "0905666777", "MALE", "1993-04-18", 2, "ACTIVE", True),
        # Customers (role_id = 2 USER)
        (7, "customer", "customer@nexspace.vn", cust_hash, "Đăng Huy", "Mai", "0914111222", "MALE", "2003-05-10", 2, "ACTIVE", True),
        (8, "khoa.nguyen", "khoa.nguyen@nexspace.vn", cust_hash, "Kim Đăng Khoa", "Nguyễn", "0914222333", "MALE", "2004-09-24", 2, "ACTIVE", True),
        (9, "vu.nguyen", "vu.nguyen@nexspace.vn", cust_hash, "Huy Vũ", "Nguyễn", "0899891697", "MALE", "2003-08-19", 2, "ACTIVE", True),
        (10, "lan.tran", "lan.tran@nexspace.vn", cust_hash, "Ngọc Lan", "Trần", "0918555666", "FEMALE", "1998-12-01", 2, "ACTIVE", True),
    ]

    organizer_profiles = [
        (
            1,
            3,  # organizer_id = 3 (organizer@nexspace.vn)
            "Công ty Cổ phần Không Gian Làm Việc NexSpace Việt Nam",
            "JOINT_STOCK",
            "0316889901",
            "Nguyễn Hoàng Nam",
            "Số 02 Đường 2 Tháng 9, Phường Bình Hiên, Quận Hải Châu, TP. Đà Nẵng",
            "0905123456",
            "organizer@nexspace.vn",
            "Vietcombank (VCB)",
            bank_acc_1,
            "CONG TY CP KHONG GIAN LAM VIEC NEXSPACE VN",
            "APPROVED",
            False,
            "Vận hành chuỗi Coworking Hub, phòng họp doanh nghiệp và studio sáng tạo tại Đà Nẵng & TP.HCM.",
            1,  # reviewed_by = 1 (admin)
            "Hồ sơ pháp lý doanh nghiệp, giấy phép ĐKKD và chứng nhận thuế hợp lệ.",
        ),
        (
            2,
            4,  # organizer_id = 4 (partner.toong@nexspace.vn)
            "Công ty Cổ phần Đầu Tư Không Gian Sáng Tạo Đông Dương (Toong)",
            "JOINT_STOCK",
            "0106998812",
            "Đỗ Sơn Tùng",
            "Số 08 Tràng Thi, Phường Hàng Trống, Quận Hoàn Kiếm, TP. Hà Nội",
            "0903888999",
            "partner.toong@nexspace.vn",
            "Techcombank (TCB)",
            bank_acc_2,
            "CONG TY CP DAU TU KHONG GIAN SANG TAO DONG DUONG",
            "APPROVED",
            False,
            "Mở rộng kênh đặt chỗ trực tuyến cho hệ thống không gian làm việc chung Toong tại Hà Nội và TP.HCM.",
            1,
            "Đã xác minh giấy phép ĐKKD và tài khoản ngân hàng doanh nghiệp.",
        ),
        (
            3,
            5,  # organizer_id = 5 (partner.dreamplex@nexspace.vn)
            "Công ty Trách Nhiệm Hữu Hạn Dreamplex Coworking Sài Gòn",
            "LIMITED_LIABILITY",
            "0313456789",
            "Lê Bảo Trâm",
            "195 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP. Hồ Chí Minh",
            "0908777666",
            "partner.dreamplex@nexspace.vn",
            "ACB - Ngân hàng Á Châu",
            bank_acc_3,
            "CONG TY TNHH DREAMPLEX COWORKING SAI GON",
            "PENDING_REVIEW",
            False,
            "Đăng ký trở thành đối tác cung cấp văn phòng dịch vụ và chỗ ngồi linh hoạt tại Quận 1 và Bình Thạnh.",
            None,
            None,
        ),
        (
            4,
            6,  # organizer_id = 6 (partner.thinkspace@nexspace.vn)
            "Hộ Kinh Doanh Không Gian Sáng Tạo ThinkSpace Đà Nẵng",
            "HOUSEHOLD_BUSINESS",
            "0402112233",
            "Phạm Quốc Anh",
            "112 Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, TP. Đà Nẵng",
            "0905666777",
            "partner.thinkspace@nexspace.vn",
            "Vietcombank (VCB)",
            bank_acc_4,
            "PHAM QUOC ANH",
            "REVISION_REQUESTED",
            False,
            "Cung cấp phòng học nhóm, podcast studio và bàn làm việc yên tĩnh cho freelancer tại trung tâm Đà Nẵng.",
            2,
            "Vui lòng tải lại ảnh CCCD mặt trước rõ nét hơn (không bị lóa sáng ở góc phải).",
        ),
    ]

    organizer_documents = [
        # Profile 1 (APPROVED)
        (1, 1, "BUSINESS_LICENSE", "Giay_Phep_DKKD_NexSpace_VN.pdf", "11111111-1111-4111-8111-111111111101.pdf", "VERIFIED", True, None),
        (2, 1, "TAX_CERTIFICATE", "Giay_Chung_Nhan_Ma_So_Thue_0316889901.pdf", "11111111-1111-4111-8111-111111111102.pdf", "VERIFIED", True, None),
        (3, 1, "ID_CARD_FRONT", "CCCD_Mat_Truoc_Nguyen_Hoang_Nam.pdf", "11111111-1111-4111-8111-111111111103.pdf", "VERIFIED", True, None),
        (4, 1, "ID_CARD_BACK", "CCCD_Mat_Sau_Nguyen_Hoang_Nam.pdf", "11111111-1111-4111-8111-111111111104.pdf", "VERIFIED", True, None),
        # Profile 2 (APPROVED)
        (5, 2, "BUSINESS_LICENSE", "Giay_Phep_DKKD_Toong_Indochina.pdf", "22222222-2222-4222-8222-222222222201.pdf", "VERIFIED", True, None),
        (6, 2, "ID_CARD_FRONT", "CCCD_Mat_Truoc_Do_Son_Tung.pdf", "22222222-2222-4222-8222-222222222202.pdf", "VERIFIED", True, None),
        (7, 2, "ID_CARD_BACK", "CCCD_Mat_Sau_Do_Son_Tung.pdf", "22222222-2222-4222-8222-222222222203.pdf", "VERIFIED", True, None),
        # Profile 3 (PENDING_REVIEW)
        (8, 3, "BUSINESS_LICENSE", "DKKD_Dreamplex_Saigon_0313456789.pdf", "33333333-3333-4333-8333-333333333301.pdf", "PENDING", True, None),
        (9, 3, "ID_CARD_FRONT", "CCCD_Mat_Truoc_Le_Bao_Tram.pdf", "33333333-3333-4333-8333-333333333302.pdf", "PENDING", True, None),
        (10, 3, "ID_CARD_BACK", "CCCD_Mat_Sau_Le_Bao_Tram.pdf", "33333333-3333-4333-8333-333333333303.pdf", "PENDING", True, None),
        # Profile 4 (REVISION_REQUESTED)
        (11, 4, "BUSINESS_LICENSE", "Giay_CN_Ho_Kinh_Doanh_ThinkSpace.pdf", "44444444-4444-4444-8444-444444444401.pdf", "VERIFIED", True, None),
        (12, 4, "ID_CARD_FRONT", "CCCD_Mat_Truoc_Pham_Quoc_Anh.pdf", "44444444-4444-4444-8444-444444444402.pdf", "REJECTED", True, "Ảnh chụp mặt trước CCCD bị lóa sáng ở góc phải, vui lòng tải lại bản scan rõ nét."),
        (13, 4, "ID_CARD_BACK", "CCCD_Mat_Sau_Pham_Quoc_Anh.pdf", "44444444-4444-4444-8444-444444444403.pdf", "VERIFIED", True, None),
    ]

    _ensure_local_sample_documents([d[4] for d in organizer_documents])

    customer_preferences = [
        (7, "DESK", "FREELANCE", "QUIET", 40000.00, 150000.00, '["Hải Châu","Sơn Trà","Quận 1"]', "[1,4,6,7,12]"),
        (8, "ROOM", "TEAM_WORK", "MODERATE", 150000.00, 600000.00, '["Hải Châu","Quận 1","Hoàn Kiếm"]', "[1,3,6,11,12]"),
        (9, "DESK", "STUDY", "QUIET", 30000.00, 100000.00, '["Hải Châu","Thanh Khê"]', "[1,2,6,13]"),
        (10, "ANY", "MEETING", "MODERATE", 100000.00, 500000.00, '["Quận 1","Bình Thạnh","Hải Châu"]', "[1,3,11,12,14]"),
    ]

    lines = [
        "-- ===================================================================",
        "-- NexSpace Accounts, Organizer Profiles & Customer Preferences Seed",
        "-- ===================================================================",
    ]

    lines.append("\n-- 1. System Users (`users`)")
    for (
        uid,
        uname,
        email,
        pw_hash,
        first_name,
        last_name,
        phone,
        gender,
        birth_date,
        role_id,
        status,
        verified,
    ) in users:
        lines.append(
            f"INSERT INTO `users` (`id`, `user_name`, `email`, `password_hash`, `first_name`, `last_name`, `phone`, "
            f"`gender`, `birth_date`, `role_id`, `status`, `is_verified`, `email_verified_at`, `preferred_locale`, "
            f"`two_factor_enabled`, `failed_login_count`, `created_at`, `updated_at`) "
            f"VALUES ({uid}, {sql_literal(uname)}, {sql_literal(email)}, {sql_literal(pw_hash)}, "
            f"{sql_literal(first_name)}, {sql_literal(last_name)}, {sql_literal(phone)}, {sql_literal(gender)}, "
            f"{sql_literal(birth_date)}, {role_id}, {sql_literal(status)}, {sql_literal(verified)}, "
            f"UTC_TIMESTAMP(6), 'vi', b'0', 0, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`), `first_name` = VALUES(`first_name`), "
            f"`last_name` = VALUES(`last_name`), `phone` = VALUES(`phone`), `role_id` = VALUES(`role_id`), "
            f"`status` = VALUES(`status`), `is_verified` = VALUES(`is_verified`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    lines.append("\n-- 2. Organizer KYC Profiles (`organizer_profile`)")
    for (
        pid,
        org_id,
        legal_name,
        btype,
        tax_id,
        rep_name,
        addr,
        c_phone,
        c_email,
        bank_name,
        bank_num,
        bank_holder,
        status,
        suspended,
        reason,
        reviewed_by,
        feedback,
    ) in organizer_profiles:
        reviewed_at_expr = "UTC_TIMESTAMP(6)" if reviewed_by is not None else "NULL"
        lines.append(
            f"INSERT INTO `organizer_profile` (`id`, `organizer_id`, `legal_name`, `business_type`, `tax_id`, "
            f"`representative_name`, `address`, `contact_phone`, `contact_email`, `bank_name`, `bank_account_number`, "
            f"`bank_account_holder`, `status`, `is_suspended`, `registration_reason`, `submitted_at`, "
            f"`reviewed_by`, `reviewed_at`, `review_feedback`, `created_at`, `updated_at`) "
            f"VALUES ({pid}, {org_id}, {sql_literal(legal_name)}, {sql_literal(btype)}, {sql_literal(tax_id)}, "
            f"{sql_literal(rep_name)}, {sql_literal(addr)}, {sql_literal(c_phone)}, {sql_literal(c_email)}, "
            f"{sql_literal(bank_name)}, {sql_literal(bank_num)}, {sql_literal(bank_holder)}, {sql_literal(status)}, "
            f"{sql_literal(suspended)}, {sql_literal(reason)}, UTC_TIMESTAMP(6), {sql_literal(reviewed_by)}, "
            f"{reviewed_at_expr}, {sql_literal(feedback)}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `legal_name` = VALUES(`legal_name`), `business_type` = VALUES(`business_type`), "
            f"`tax_id` = VALUES(`tax_id`), `bank_name` = VALUES(`bank_name`), "
            f"`bank_account_number` = VALUES(`bank_account_number`), `bank_account_holder` = VALUES(`bank_account_holder`), "
            f"`status` = VALUES(`status`), `registration_reason` = VALUES(`registration_reason`), "
            f"`reviewed_by` = VALUES(`reviewed_by`), `review_feedback` = VALUES(`review_feedback`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    lines.append("\n-- 3. Organizer Verification Documents (`organizer_document`)")
    for doc_id, prof_id, doc_type, fname, furl, status, is_curr, feedback in organizer_documents:
        lines.append(
            f"INSERT INTO `organizer_document` (`id`, `organizer_profile_id`, `document_type`, `file_name`, `file_url`, "
            f"`status`, `is_current`, `admin_feedback`, `uploaded_at`, `updated_at`) "
            f"VALUES ({doc_id}, {prof_id}, {sql_literal(doc_type)}, {sql_literal(fname)}, {sql_literal(furl)}, "
            f"{sql_literal(status)}, {sql_literal(is_curr)}, {sql_literal(feedback)}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `file_name` = VALUES(`file_name`), `file_url` = VALUES(`file_url`), "
            f"`status` = VALUES(`status`), `is_current` = VALUES(`is_current`), `admin_feedback` = VALUES(`admin_feedback`), "
            f"`updated_at` = UTC_TIMESTAMP(6);"
        )

    lines.append("\n-- 4. Customer Personalization Preferences (`customer_preference`)")
    for cid, rcat, purpose, noise, bmin, bmax, districts_json, amenities_json in customer_preferences:
        lines.append(
            f"INSERT INTO `customer_preference` (`customer_id`, `resource_category`, `purpose`, `noise_level`, "
            f"`budget_min`, `budget_max`, `districts_json`, `amenity_ids_json`, `updated_at`) "
            f"VALUES ({cid}, {sql_literal(rcat)}, {sql_literal(purpose)}, {sql_literal(noise)}, {bmin}, {bmax}, "
            f"{sql_literal(districts_json)}, {sql_literal(amenities_json)}, UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `resource_category` = VALUES(`resource_category`), `purpose` = VALUES(`purpose`), "
            f"`noise_level` = VALUES(`noise_level`), `budget_min` = VALUES(`budget_min`), `budget_max` = VALUES(`budget_max`), "
            f"`districts_json` = VALUES(`districts_json`), `amenity_ids_json` = VALUES(`amenity_ids_json`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    return "\n".join(lines) + "\n"


def seed_accounts(executor: DatabaseExecutor | None = None) -> None:
    cfg = load_db_config()
    db = executor or DatabaseExecutor(cfg)
    print("-> Đang khởi tạo tài khoản hệ thống (Admin, Organizer, Customer) & Hồ sơ KYC...")
    sql = build_accounts_sql(cfg)
    db.execute_sql_script(sql)
    counts = db.get_table_counts(["users", "organizer_profile", "organizer_document", "customer_preference"])
    print("   [OK] Hoàn tất Accounts & KYC:")
    for tbl, cnt in counts.items():
        print(f"        - {tbl:<24}: {cnt} bản ghi")


if __name__ == "__main__":
    seed_accounts()

