#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NexSpace Complete Database Initializer (`init_data.py`)
=======================================================
Initializes the NexSpace database with complete, business-coherent seed data:
  1. Schema check (auto-applies `V1__init_schema.sql` if the database has no tables)
  2. Master Catalogs (`roles`, `business_type`, `amenity`, `platform_setting`, `notification_template`)
  3. Core Accounts & KYC (`users`, `organizer_profile`, `organizer_document`, `customer_preference`)
  4. NexSpace Business Ecosystem (`building`, `building_floor`, `workspace`,
     `workspace_operating_hour`, `workspace_cancellation_rule`, `workspace_amenity`,
     `media`, `floor_plan`, `resource_type`, `bookable_resource`, `resource_blocked_slot`,
     `workspace_asset`, `asset_maintenance_log`, `pricing_rule`, `discount_rule`,
     `membership_plan`, `membership_subscription`, `booking`, `payment_transaction`,
     `organizer_payout`, `refund_request`, `customer_review`, `review_reaction`,
     `favorite_workspace`, `saved_search_filter`, `recommendation_event`,
     `support_case`, `support_case_message`, `user_notification`, `audit_log`)

Modes (`--mode`):
  - `full` (default) : Seeds Master Catalogs + Accounts + Full Business Ecosystem
  - `master`         : Seeds only Master Catalogs + Core Accounts (Admin, Organizer, Customer)

Usage:
  python3 spring-starter/scripts/db/init_data.py
  python3 spring-starter/scripts/db/init_data.py --clear-first
  python3 spring-starter/scripts/db/init_data.py --mode master
"""

from __future__ import annotations

import argparse
from clear_data import clear_database
from db_helper import DatabaseExecutor, get_sorted_migration_files, load_db_config, sql_literal
from seed_accounts import seed_accounts
from seed_master_data import seed_master_data


def build_business_ecosystem_sql() -> str:
    """Generates idempotent SQL for the NexSpace workspace, resource, booking, payment & governance ecosystem."""
    lines = [
        "-- ===================================================================",
        "-- NexSpace Business Ecosystem Seed (Workspaces, Floor Plans, Bookings)",
        "-- ===================================================================",
        "SET FOREIGN_KEY_CHECKS = 0;",
    ]

    # -------------------------------------------------------------------------
    # 1. BUILDINGS & PHYSICAL FLOORS (`building`, `building_floor`)
    # -------------------------------------------------------------------------
    buildings = [
        (1, 3, "NexSpace Innovation Tower Đà Nẵng", "Số 02 Đường 2 Tháng 9, Phường Bình Hiên, Quận Hải Châu, TP. Đà Nẵng"),
        (2, 3, "Saigon Marina IFC Center", "Số 02 Tôn Đức Thắng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"),
        (3, 4, "Toong Tràng Thi Heritage Building", "Số 08 Tràng Thi, Phường Hàng Trống, Quận Hoàn Kiếm, TP. Hà Nội"),
    ]
    lines.append("\n-- 1. Buildings (`building`)")
    for bid, org_id, name, addr in buildings:
        lines.append(
            f"INSERT INTO `building` (`id`, `organizer_id`, `name`, `address`, `created_at`, `updated_at`) "
            f"VALUES ({bid}, {org_id}, {sql_literal(name)}, {sql_literal(addr)}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `address` = VALUES(`address`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    building_floors = [
        (1, 1, "Tầng 3 — Khu Coworking & Phòng Họp Sông Hàn", 3, 1200.00, 800.00),
        (2, 1, "Tầng 4 — Khu Creative Studio & Sky Lounge", 4, 1200.00, 800.00),
        (3, 2, "Tầng 12 — Khu Executive Serviced Office Quận 1", 12, 1400.00, 900.00),
        (4, 3, "Tầng 2 — Khu Không Gian Sáng Tạo Đông Dương", 2, 1000.00, 700.00),
    ]
    lines.append("\n-- 2. Building Floors (`building_floor`)")
    for bfid, bid, name, fnum, cw, ch in building_floors:
        lines.append(
            f"INSERT INTO `building_floor` (`id`, `building_id`, `name`, `floor_number`, `canvas_width`, `canvas_height`, `created_at`, `updated_at`) "
            f"VALUES ({bfid}, {bid}, {sql_literal(name)}, {fnum}, {cw}, {ch}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `canvas_width` = VALUES(`canvas_width`), `canvas_height` = VALUES(`canvas_height`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    # -------------------------------------------------------------------------
    # 2. WORKSPACES (`workspace`, `workspace_operating_hour`, `workspace_cancellation_rule`, `workspace_amenity`, `media`)
    # -------------------------------------------------------------------------
    workspaces = [
        (
            1,
            3,  # organizer@nexspace.vn
            "NexSpace Executive Hub Hải Châu",
            "COWORKING_HUB",
            "Không gian làm việc chung cao cấp ven sông Hàn với đường truyền cáp quang 1 Gbps, ghế công thái học Herman Miller Aeron, phòng họp hội nghị 4K và quầy Specialty Espresso miễn phí.",
            "Số 02 Đường 2 Tháng 9, Phường Bình Hiên",
            "Quận Hải Châu",
            "Đà Nẵng",
            16.05940000,
            108.22170000,
            480.00,
            "INSTANT",
            "ACTIVE",
            "02363888999",
            "Quét mã QR tại sảnh lễ tân tầng 3 tòa nhà NexSpace Innovation Tower để nhận thẻ thang máy.",
            1,
            1,
            "Không gian đạt chuẩn chất lượng 5 sao của NexSpace.",
        ),
        (
            2,
            3,  # organizer@nexspace.vn
            "NexSpace Sky Lounge & Studios Sơn Trà",
            "CREATIVE_STUDIO",
            "Tổ hợp studio sáng tạo, podcast booth cách âm và khu vực làm việc nhóm hướng biển Mỹ Khê dành cho đội ngũ thiết kế, truyền thông và startup công nghệ.",
            "Số 168 Võ Nguyên Giáp, Phường Phước Mỹ",
            "Quận Sơn Trà",
            "Đà Nẵng",
            16.06800000,
            108.24350000,
            320.00,
            "INSTANT",
            "ACTIVE",
            "02363888777",
            "Gửi xe tại tầng hầm B1, đi thang máy tốc độ cao lên tầng 4 và xuất trình mã đặt chỗ trên ứng dụng.",
            2,
            1,
            "Đã kiểm duyệt hình ảnh và trang thiết bị phòng thu.",
        ),
        (
            3,
            3,  # organizer@nexspace.vn
            "NexSpace Saigon Prime Center Quận 1",
            "SERVICED_OFFICE",
            "Văn phòng dịch vụ hạng A ngay trung tâm tài chính Quận 1 với tầm nhìn toàn cảnh sông Sài Gòn, phòng họp hội đồng quản trị 16 chỗ và lễ tân song ngữ chuyên nghiệp.",
            "Số 02 Tôn Đức Thắng, Phường Bến Nghé",
            "Quận 1",
            "Hồ Chí Minh",
            10.77970000,
            106.70610000,
            650.00,
            "INSTANT",
            "ACTIVE",
            "02838228899",
            "Đăng ký tại quầy an ninh sảnh chính tòa nhà Saigon Marina IFC kèm căn cước công dân hoặc mã QR NexSpace.",
            3,
            1,
            "Hồ sơ không gian văn phòng hạng A hợp lệ.",
        ),
        (
            4,
            4,  # partner.toong@nexspace.vn
            "Toong Tràng Thi Heritage Coworking",
            "COWORKING_HUB",
            "Sự giao thoa giữa kiến trúc Đông Dương cổ điển và không gian làm việc đương đại ngay trung tâm quận Hoàn Kiếm, cách Hồ Gươm chỉ 3 phút đi bộ.",
            "Số 08 Tràng Thi, Phường Hàng Trống",
            "Quận Hoàn Kiếm",
            "Hà Nội",
            21.02680000,
            105.85050000,
            420.00,
            "MANUAL_APPROVAL",
            "ACTIVE",
            "02439263888",
            "Đi qua cổng biệt thự cổ số 8 Tràng Thi, lên cầu thang gỗ tầng 2 và gặp Community Manager tại quầy bar.",
            4,
            1,
            "Không gian đối tác chiến lược Toong tại Hà Nội.",
        ),
        (
            5,
            3,  # organizer@nexspace.vn
            "NexSpace Tech Park Cẩm Lệ",
            "BUSINESS_LOUNGE",
            "Business Lounge hiện đại phục vụ các kỹ sư phần mềm và chuyên gia tư vấn với hệ thống màn hình đôi 4K và phòng họp trực tuyến tiêu chuẩn quốc tế.",
            "Số 45 Cách Mạng Tháng 8, Phường Khuê Trung",
            "Quận Cẩm Lệ",
            "Đà Nẵng",
            16.02850000,
            108.20910000,
            290.00,
            "INSTANT",
            "PENDING_REVIEW",
            "02363888555",
            "Check-in tự động tại cổng xoay thông minh tầng 2.",
            None,
            None,
            None,
        ),
        (
            6,
            4,  # partner.toong@nexspace.vn
            "Toong Thảo Điền Garden Studio",
            "CREATIVE_STUDIO",
            "Không gian làm việc xanh giữa khu vườn nhiệt đới Thảo Điền, lý tưởng cho kiến trúc sư, nghệ sĩ và nhà sáng tạo nội dung.",
            "Số 28 Xuân Thủy, Phường Thảo Điền",
            "TP. Thủ Đức",
            "Hồ Chí Minh",
            10.80310000,
            106.73690000,
            240.00,
            "INSTANT",
            "DRAFT",
            "02837446868",
            "Vào cổng chính khu biệt thự sân vườn số 28 Xuân Thủy.",
            None,
            None,
            None,
        ),
    ]

    lines.append("\n-- 3. Workspaces (`workspace`)")
    for (
        wid,
        org_id,
        name,
        cat,
        desc,
        addr,
        dist,
        city,
        lat,
        lng,
        area,
        mode,
        status,
        phone,
        entry,
        f_order,
        rev_by,
        rev_fb,
    ) in workspaces:
        sub_at = "UTC_TIMESTAMP(6)" if status != "DRAFT" else "NULL"
        rev_at = "UTC_TIMESTAMP(6)" if rev_by is not None else "NULL"
        f_until = "DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 60 DAY)" if f_order is not None else "NULL"
        lines.append(
            f"INSERT INTO `workspace` (`id`, `organizer_id`, `name`, `category`, `description`, `address`, `district`, "
            f"`city`, `latitude`, `longitude`, `area_sqm`, `booking_confirmation_mode`, `status`, `support_phone`, "
            f"`entry_instructions`, `featured_order`, `featured_until`, `submitted_at`, `reviewed_by`, `reviewed_at`, "
            f"`review_feedback`, `created_at`, `updated_at`) "
            f"VALUES ({wid}, {org_id}, {sql_literal(name)}, {sql_literal(cat)}, {sql_literal(desc)}, {sql_literal(addr)}, "
            f"{sql_literal(dist)}, {sql_literal(city)}, {lat}, {lng}, {area}, {sql_literal(mode)}, {sql_literal(status)}, "
            f"{sql_literal(phone)}, {sql_literal(entry)}, {sql_literal(f_order)}, {f_until}, {sub_at}, "
            f"{sql_literal(rev_by)}, {rev_at}, {sql_literal(rev_fb)}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `category` = VALUES(`category`), "
            f"`description` = VALUES(`description`), `address` = VALUES(`address`), `district` = VALUES(`district`), "
            f"`city` = VALUES(`city`), `latitude` = VALUES(`latitude`), `longitude` = VALUES(`longitude`), "
            f"`status` = VALUES(`status`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    # Operating hours (Mon=1 .. Sun=7 for workspaces 1..6)
    lines.append("\n-- 4. Workspace Operating Hours (`workspace_operating_hour`)")
    for wid in range(1, 7):
        for day in range(1, 8):
            is_closed = False
            open_t = "07:30:00" if day <= 5 else "08:30:00"
            close_t = "21:30:00" if day <= 5 else "19:00:00"
            lines.append(
                f"INSERT INTO `workspace_operating_hour` (`workspace_id`, `day_of_week`, `open_time`, `close_time`, `is_closed`) "
                f"VALUES ({wid}, {day}, {sql_literal(open_t)}, {sql_literal(close_t)}, {sql_literal(is_closed)}) "
                f"ON DUPLICATE KEY UPDATE `open_time` = VALUES(`open_time`), `close_time` = VALUES(`close_time`), `is_closed` = VALUES(`is_closed`);"
            )

    # Cancellation rules (24h -> 100%, 6h -> 50%, 0h -> 0%)
    lines.append("\n-- 5. Workspace Cancellation Rules (`workspace_cancellation_rule`)")
    wcr_id = 1
    for wid in range(1, 6):
        for min_hours, refund_pct in [(24, 100.00), (6, 50.00), (0, 0.00)]:
            lines.append(
                f"INSERT INTO `workspace_cancellation_rule` (`id`, `workspace_id`, `min_hours_before_start`, `refund_percent`, `created_at`, `updated_at`) "
                f"VALUES ({wcr_id}, {wid}, {min_hours}, {refund_pct}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
                f"ON DUPLICATE KEY UPDATE `refund_percent` = VALUES(`refund_percent`), `updated_at` = UTC_TIMESTAMP(6);"
            )
            wcr_id += 1

    # Workspace Amenities (`workspace_amenity`)
    lines.append("\n-- 6. Workspace Amenities (`workspace_amenity`)")
    ws_amenities = [
        # Workspace 1 (Executive Hub Hai Chau): amenities 1,2,3,4,5,6,7,8,11,12,13,14
        (1, 1, 1, None), (2, 1, 2, None), (3, 1, 3, None), (4, 1, 4, 25000.00),
        (5, 1, 5, None), (6, 1, 6, None), (7, 1, 7, None), (8, 1, 8, None),
        (9, 1, 11, None), (10, 1, 12, None), (11, 1, 13, None), (12, 1, 14, None),
        # Workspace 2 (Sky Lounge Son Tra): amenities 1,2,3,6,12,13,15
        (13, 2, 1, None), (14, 2, 2, None), (15, 2, 3, None), (16, 2, 6, None),
        (17, 2, 12, None), (18, 2, 13, None), (19, 2, 15, None),
        # Workspace 3 (Saigon Prime Center Q1): amenities 1,2,3,4,5,6,7,8,9,11,12,13,14
        (20, 3, 1, None), (21, 3, 2, None), (22, 3, 3, None), (23, 3, 4, 30000.00),
        (24, 3, 5, None), (25, 3, 6, None), (26, 3, 7, None), (27, 3, 8, None),
        (28, 3, 11, None), (29, 3, 12, None), (30, 3, 13, None), (31, 3, 14, None),
        # Workspace 4 (Toong Trang Thi): amenities 1,2,5,6,8,10,11,12,13,14
        (32, 4, 1, None), (33, 4, 2, None), (34, 4, 5, None), (35, 4, 6, None),
        (36, 4, 8, None), (37, 4, 10, None), (38, 4, 11, None), (39, 4, 12, None),
        (40, 4, 13, None), (41, 4, 14, None),
        # Workspace 5 (Tech Park Cam Le): amenities 1,3,4,6,12,13
        (42, 5, 1, None), (43, 5, 3, None), (44, 5, 4, None), (45, 5, 6, None),
        (46, 5, 12, None), (47, 5, 13, None),
    ]
    for wa_id, wid, am_id, addon in ws_amenities:
        lines.append(
            f"INSERT INTO `workspace_amenity` (`id`, `workspace_id`, `resource_id`, `amenity_id`, `addon_price_per_hour`, `created_at`, `updated_at`) "
            f"VALUES ({wa_id}, {wid}, NULL, {am_id}, {sql_literal(addon)}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `addon_price_per_hour` = VALUES(`addon_price_per_hour`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    # Workspace Gallery Media (`media`)
    lines.append("\n-- 7. Workspace Media Gallery (`media`)")
    media_items = [
        (1, 1, None, "IMAGE", "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80", 0, True),
        (2, 1, None, "IMAGE", "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80", 1, False),
        (3, 1, None, "IMAGE", "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80", 2, False),
        (4, 2, None, "IMAGE", "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80", 0, True),
        (5, 2, None, "IMAGE", "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80", 1, False),
        (6, 3, None, "IMAGE", "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80", 0, True),
        (7, 3, None, "IMAGE", "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80", 1, False),
        (8, 4, None, "IMAGE", "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1200&q=80", 0, True),
        (9, 4, None, "IMAGE", "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80", 1, False),
        (10, 5, None, "IMAGE", "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80", 0, True),
    ]
    for mid, wid, rid, mtype, url, dorder, is_cov in media_items:
        lines.append(
            f"INSERT INTO `media` (`id`, `workspace_id`, `resource_id`, `media_type`, `url`, `display_order`, `is_cover`, `created_at`, `updated_at`) "
            f"VALUES ({mid}, {wid}, {sql_literal(rid)}, {sql_literal(mtype)}, {sql_literal(url)}, {dorder}, {sql_literal(is_cov)}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `url` = VALUES(`url`), `display_order` = VALUES(`display_order`), `is_cover` = VALUES(`is_cover`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    # -------------------------------------------------------------------------
    # 3. FLOOR PLANS, RESOURCE TYPES & BOOKABLE RESOURCES
    # -------------------------------------------------------------------------
    floor_plans = [
        (
            1,
            1,  # Workspace 1
            1,  # building_floor_id = 1
            "Tầng 3 — Sàn Coworking & Phòng Họp Sông Hàn",
            3,
            "PUBLISHED",
            2,
            0.00,
            0.00,
            1200.00,
            800.00,
            '{"canvasWidth":1200,"canvasHeight":800,"gridSize":20,"zones":[{"id":"z1","name":"Hot Desk Zone A","x":40,"y":40,"width":520,"height":340},{"id":"z2","name":"Executive Suites","x":600,"y":40,"width":540,"height":340}]}',
        ),
        (
            2,
            2,  # Workspace 2
            2,  # building_floor_id = 2
            "Tầng 4 — Creative Studio & Podcast Hub",
            4,
            "PUBLISHED",
            1,
            0.00,
            0.00,
            1200.00,
            800.00,
            '{"canvasWidth":1200,"canvasHeight":800,"gridSize":20,"zones":[{"id":"z1","name":"Creator Zone","x":40,"y":40,"width":1100,"height":700}]}',
        ),
        (
            3,
            3,  # Workspace 3
            3,  # building_floor_id = 3
            "Tầng 12 — Saigon Marina Executive Floor",
            12,
            "PUBLISHED",
            1,
            0.00,
            0.00,
            1400.00,
            900.00,
            '{"canvasWidth":1400,"canvasHeight":900,"gridSize":20,"zones":[{"id":"z1","name":"Marina Panorama Desks","x":50,"y":50,"width":1300,"height":800}]}',
        ),
        (
            4,
            4,  # Workspace 4
            4,  # building_floor_id = 4
            "Tầng 2 — Indochine Main Hall",
            2,
            "PUBLISHED",
            1,
            0.00,
            0.00,
            1000.00,
            700.00,
            '{"canvasWidth":1000,"canvasHeight":700,"gridSize":20,"zones":[{"id":"z1","name":"Heritage Hall","x":40,"y":40,"width":920,"height":620}]}',
        ),
    ]
    lines.append("\n-- 8. Floor Plans (`floor_plan`)")
    for fpid, wid, bfid, name, fnum, status, ver, ux, uy, uw, uh, ljson in floor_plans:
        lines.append(
            f"INSERT INTO `floor_plan` (`id`, `workspace_id`, `building_floor_id`, `name`, `floor_number`, `status`, "
            f"`version`, `usage_x`, `usage_y`, `usage_width`, `usage_height`, `layout_json`, `draft_layout_json`, "
            f"`published_at`, `created_at`, `updated_at`) "
            f"VALUES ({fpid}, {wid}, {bfid}, {sql_literal(name)}, {fnum}, {sql_literal(status)}, {ver}, "
            f"{ux}, {uy}, {uw}, {uh}, {sql_literal(ljson)}, {sql_literal(ljson)}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `status` = VALUES(`status`), `layout_json` = VALUES(`layout_json`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    resource_types = [
        # Workspace 1
        (1, 1, "Bàn Linh Hoạt (Hot Desk)", "DESK", 1, 45000.00, 250000.00, 3500000.00, "VND", "Chỗ ngồi linh hoạt khu vực mở kèm ghế công thái học Herman Miller và ổ cắm đa năng.", True),
        (2, 1, "Bàn Cố Định Màn Hình Đôi (Dedicated Pro Desk)", "DESK", 1, 75000.00, 420000.00, 5200000.00, "VND", "Bàn nâng hạ chiều cao trang bị sẵn 2 màn hình Dell UltraSharp 27-inch 4K USB-C.", True),
        (3, 1, "Phòng Họp Điều Hành Sông Hàn (Boardroom 12P)", "ROOM", 12, 350000.00, 2200000.00, 28000000.00, "VND", "Phòng họp cách âm 12 người với màn hình hội nghị 75-inch 4K, camera Poly Studio và bảng kính.", True),
        (4, 1, "Buồng Tập Trung Cách Âm (Focus Pod 2P)", "ROOM", 2, 120000.00, 680000.00, 9500000.00, "VND", "Buồng làm việc/họp 1-1 cách âm tiêu chuẩn 38dB dành cho các cuộc gọi quan trọng.", True),
        # Workspace 2
        (5, 2, "Bàn Sáng Tạo Hướng Biển (Ocean Creator Desk)", "DESK", 1, 50000.00, 280000.00, 3800000.00, "VND", "Bàn làm việc rộng 1m6 ánh sáng tự nhiên hướng biển Mỹ Khê.", True),
        (6, 2, "Phòng Thu Podcast & Livestream 4K", "ROOM", 4, 420000.00, 2600000.00, None, "VND", "Studio cách âm trang bị 4 micro Shure SM7B, bàn trộn Rodecaster Pro II và hệ thống đèn key light.", True),
        # Workspace 3
        (7, 3, "Marina Executive Hot Desk", "DESK", 1, 65000.00, 380000.00, 4800000.00, "VND", "Chỗ ngồi hạng thương gia tại trung tâm tài chính Quận 1.", True),
        (8, 3, "Saigon Boardroom VIP (16 Pax)", "ROOM", 16, 550000.00, 3500000.00, 45000000.00, "VND", "Phòng họp hội đồng quản trị nhìn ra bến Bạch Đằng, phục vụ trà & cà phê tận phòng.", True),
        # Workspace 4
        (9, 4, "Indochine Heritage Desk", "DESK", 1, 55000.00, 300000.00, 4000000.00, "VND", "Chỗ ngồi yên tĩnh trong không gian kiến trúc Đông Dương cổ điển.", True),
        (10, 4, "Phòng Họp Tràng Thi Suite (8 Pax)", "ROOM", 8, 280000.00, 1800000.00, 22000000.00, "VND", "Phòng họp ấm cúng 8 người cho các buổi thảo luận chiến lược.", True),
    ]
    lines.append("\n-- 9. Resource Types (`resource_type`)")
    for rtid, wid, name, cat, cap, p_hr, p_day, p_mo, curr, desc, active in resource_types:
        lines.append(
            f"INSERT INTO `resource_type` (`id`, `workspace_id`, `name`, `category`, `capacity`, `price_per_hour`, "
            f"`price_per_day`, `price_per_month`, `currency`, `description`, `is_active`, `created_at`, `updated_at`) "
            f"VALUES ({rtid}, {wid}, {sql_literal(name)}, {sql_literal(cat)}, {cap}, {sql_literal(p_hr)}, "
            f"{sql_literal(p_day)}, {sql_literal(p_mo)}, {sql_literal(curr)}, {sql_literal(desc)}, {sql_literal(active)}, "
            f"UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `price_per_hour` = VALUES(`price_per_hour`), `price_per_day` = VALUES(`price_per_day`), "
            f"`price_per_month` = VALUES(`price_per_month`), `description` = VALUES(`description`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    bookable_resources = [
        # Floor Plan 1 (Workspace 1 — Executive Hub Hải Châu)
        (1, 1, 1, None, "HD-01", "Hot Desk Sông Hàn 01", "Zone A — Open Co-working", "MODERATE", 80.00, 100.00, 90.00, 60.00, 0.00, 45000.00, 1, "ACTIVE", "Bàn làm việc cạnh cửa sổ kính nhìn ra cầu Rồng."),
        (2, 1, 1, None, "HD-02", "Hot Desk Sông Hàn 02", "Zone A — Open Co-working", "MODERATE", 190.00, 100.00, 90.00, 60.00, 0.00, 45000.00, 1, "ACTIVE", "Bàn làm việc trung tâm gần quầy Espresso Bar."),
        (3, 1, 1, None, "HD-03", "Hot Desk Sông Hàn 03", "Zone A — Open Co-working", "MODERATE", 300.00, 100.00, 90.00, 60.00, 0.00, 45000.00, 1, "ACTIVE", "Bàn làm việc tiêu chuẩn trang bị ổ cắm quốc tế."),
        (4, 1, 2, None, "DD-01", "Pro Dual-Monitor Station 01", "Zone B — Quiet Deep Work", "QUIET", 80.00, 240.00, 110.00, 70.00, 0.00, 75000.00, 1, "ACTIVE", "Trạm làm việc 2 màn hình 4K kèm bàn nâng hạ điện."),
        (5, 1, 2, None, "DD-02", "Pro Dual-Monitor Station 02", "Zone B — Quiet Deep Work", "QUIET", 210.00, 240.00, 110.00, 70.00, 0.00, 75000.00, 1, "ACTIVE", "Trạm làm việc 2 màn hình 4K khu vực yên tĩnh tuyệt đối."),
        (6, 1, 3, None, "MR-01", "Phòng Họp Sông Hàn Boardroom", "Zone C — Executive Suites", "QUIET", 640.00, 80.00, 320.00, 220.00, 0.00, 350000.00, 12, "ACTIVE", "Phòng họp 12 chỗ trang bị màn hình 75-inch 4K & hệ thống âm thanh hội nghị."),
        (7, 1, 4, None, "FP-01", "Focus Pod Cách Âm 01", "Zone C — Executive Suites", "QUIET", 640.00, 340.00, 140.00, 120.00, 0.00, 120000.00, 2, "ACTIVE", "Buồng họp nhanh 2 người cách âm tiêu chuẩn studio."),
        # Child desks inside MR-01 (parent_room_id = 6)
        (8, 1, 1, 6, "MR-01-D1", "Ghế Chủ Tọa Boardroom 01", "Zone C — Executive Suites", "QUIET", 670.00, 110.00, 50.00, 45.00, 0.00, 45000.00, 1, "ACTIVE", "Vị trí chủ tọa trong phòng họp Sông Hàn."),
        (9, 1, 1, 6, "MR-01-D2", "Ghế Thành Viên Boardroom 02", "Zone C — Executive Suites", "QUIET", 730.00, 110.00, 50.00, 45.00, 0.00, 45000.00, 1, "ACTIVE", "Vị trí thành viên trong phòng họp Sông Hàn."),
        # Floor Plan 2 (Workspace 2 — Sky Lounge Sơn Trà)
        (10, 2, 5, None, "OC-01", "Ocean Creator Desk 01", "Creator Zone", "LIVELY", 100.00, 100.00, 100.00, 65.00, 0.00, 50000.00, 1, "ACTIVE", "Bàn thiết kế hướng biển Mỹ Khê."),
        (11, 2, 6, None, "ST-01", "Podcast & Livestream Studio A", "Studio Wing", "QUIET", 500.00, 100.00, 280.00, 200.00, 0.00, 420000.00, 4, "ACTIVE", "Phòng thu âm & quay hình 4K chuyên nghiệp."),
        # Floor Plan 3 (Workspace 3 — Saigon Prime Center Q1)
        (12, 3, 7, None, "SG-HD-01", "Marina Executive Desk 01", "Marina Lounge", "QUIET", 120.00, 120.00, 95.00, 60.00, 0.00, 65000.00, 1, "ACTIVE", "Chỗ ngồi hạng A nhìn ra sông Sài Gòn."),
        (13, 3, 8, None, "SG-VIP-01", "Saigon Boardroom VIP", "Executive Wing", "QUIET", 600.00, 120.00, 360.00, 240.00, 0.00, 550000.00, 16, "ACTIVE", "Phòng họp VIP 16 người tầng 12."),
        # Floor Plan 4 (Workspace 4 — Toong Tràng Thi)
        (14, 4, 9, None, "HN-HD-01", "Indochine Desk 01", "Heritage Hall", "QUIET", 100.00, 100.00, 90.00, 60.00, 0.00, 55000.00, 1, "ACTIVE", "Bàn làm việc gỗ tự nhiên cạnh ban công Tràng Thi."),
        (15, 4, 10, None, "HN-MR-01", "Phòng Họp Tràng Thi Suite", "Heritage Suite", "QUIET", 480.00, 100.00, 260.00, 180.00, 0.00, 280000.00, 8, "ACTIVE", "Phòng họp 8 người phong cách Đông Dương."),
    ]
    lines.append("\n-- 10. Bookable Resources (`bookable_resource`)")
    for (
        brid,
        fpid,
        rtid,
        parent_id,
        label,
        name,
        zone,
        noise,
        px,
        py,
        w,
        h,
        rot,
        p_hr,
        cap_ov,
        status,
        desc,
    ) in bookable_resources:
        lines.append(
            f"INSERT INTO `bookable_resource` (`id`, `floor_plan_id`, `resource_type_id`, `parent_room_id`, `label`, "
            f"`name`, `zone_name`, `noise_level`, `pos_x`, `pos_y`, `width`, `height`, `rotation`, `price_per_hour`, "
            f"`capacity_override`, `status`, `description`, `created_at`, `updated_at`) "
            f"VALUES ({brid}, {fpid}, {rtid}, {sql_literal(parent_id)}, {sql_literal(label)}, {sql_literal(name)}, "
            f"{sql_literal(zone)}, {sql_literal(noise)}, {px}, {py}, {w}, {h}, {rot}, {p_hr}, {cap_ov}, "
            f"{sql_literal(status)}, {sql_literal(desc)}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `pos_x` = VALUES(`pos_x`), `pos_y` = VALUES(`pos_y`), "
            f"`price_per_hour` = VALUES(`price_per_hour`), `status` = VALUES(`status`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    # -------------------------------------------------------------------------
    # 4. WORKSPACE ASSETS, MAINTENANCE LOGS & BLOCKED SLOTS
    # -------------------------------------------------------------------------
    lines.append("\n-- 11. Workspace Assets (`workspace_asset`)")
    assets = [
        (1, 1, 6, 11, "NX-DN-TV75-01", "Màn hình hội nghị LG UltraHD 75-inch + Poly Studio Bar", 1, "IN_USE", "2026-01-15", 48500000.00, "2029-01-15", "2026-12-15", "Lắp đặt cố định tại Phòng Họp Sông Hàn MR-01"),
        (2, 1, 4, 4, "NX-DN-MON27-01", "Bộ đôi màn hình Dell UltraSharp U2723QE 4K USB-C", 2, "IN_USE", "2026-02-10", 26800000.00, "2029-02-10", "2026-11-30", "Trang bị cho bàn Pro Dual-Monitor DD-01"),
        (3, 1, None, 6, "NX-DN-CHR-01", "Lô ghế công thái học Herman Miller Aeron Size B", 20, "IN_USE", "2026-01-10", 360000000.00, "2031-01-10", "2027-01-10", "Trang bị toàn bộ khu vực tầng 3"),
        (4, 2, 11, 3, "NX-ST-POD-01", "Hệ thống thu âm Rodecaster Pro II & 4x Shure SM7B", 1, "IN_USE", "2026-03-01", 62000000.00, "2028-03-01", "2026-12-01", "Trang bị tại Podcast Studio ST-01"),
    ]
    for aid, wid, rid, amid, code, name, qty, status, pdate, pprice, wuntil, next_m, note in assets:
        lines.append(
            f"INSERT INTO `workspace_asset` (`id`, `workspace_id`, `resource_id`, `amenity_id`, `asset_code`, `name`, "
            f"`quantity`, `status`, `purchase_date`, `purchase_price`, `warranty_until`, `next_maintenance_date`, `note`, "
            f"`created_at`, `updated_at`) "
            f"VALUES ({aid}, {wid}, {sql_literal(rid)}, {sql_literal(amid)}, {sql_literal(code)}, {sql_literal(name)}, "
            f"{qty}, {sql_literal(status)}, {sql_literal(pdate)}, {pprice}, {sql_literal(wuntil)}, {sql_literal(next_m)}, "
            f"{sql_literal(note)}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `status` = VALUES(`status`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    lines.append("\n-- 12. Resource Blocked Slots (`resource_blocked_slot`)")
    lines.append(
        "INSERT INTO `resource_blocked_slot` (`id`, `resource_id`, `created_by`, `block_type`, `start_time`, `end_time`, `reason`, `created_at`, `updated_at`) "
        "VALUES (1, 7, 3, 'MAINTENANCE', DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 3 DAY), DATE_ADD(UTC_TIMESTAMP(6), INTERVAL '3 2' DAY_HOUR), "
        "'Bảo trì định kỳ hệ thống lọc khí và quạt thông gió Focus Pod FP-01', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
        "ON DUPLICATE KEY UPDATE `reason` = VALUES(`reason`), `updated_at` = UTC_TIMESTAMP(6);"
    )

    lines.append("\n-- 13. Asset Maintenance Logs (`asset_maintenance_log`)")
    lines.append(
        "INSERT INTO `asset_maintenance_log` (`id`, `asset_id`, `blocked_slot_id`, `reported_by`, `maintenance_type`, `status`, "
        "`description`, `performed_by`, `cost`, `scheduled_at`, `started_at`, `completed_at`, `result_note`, `created_at`, `updated_at`) "
        "VALUES (1, 1, NULL, 3, 'INSPECTION', 'COMPLETED', 'Kiểm tra định kỳ độ phân giải màn hình 75-inch và cân chỉnh micro hội nghị Poly Studio', "
        "'Kỹ thuật viên LG Enterprise Đà Nẵng', 500000.00, DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 15 DAY), "
        "DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 15 DAY), DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 15 DAY), "
        "'Thiết bị hoạt động hoàn hảo, đã cập nhật firmware mới nhất.', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
        "ON DUPLICATE KEY UPDATE `result_note` = VALUES(`result_note`), `updated_at` = UTC_TIMESTAMP(6);"
    )

    # -------------------------------------------------------------------------
    # 5. PRICING RULES, DISCOUNTS & MEMBERSHIPS
    # -------------------------------------------------------------------------
    lines.append("\n-- 14. Dynamic Pricing Rules (`pricing_rule`)")
    pricing_rules = [
        (1, 1, 3, None, "Phụ phí khung giờ cao điểm sáng (Peak Hour Boardroom)", "PEAK_HOUR", 1.15, 0.00, "08:30:00", "11:30:00", 10, True),
        (2, 1, 1, None, "Ưu đãi cuối tuần (Weekend Hot Desk)", "WEEKEND", 0.90, 0.00, "08:00:00", "19:00:00", 5, True),
        (3, 3, 8, None, "Khung giờ hội nghị doanh nghiệp Quận 1", "PEAK_HOUR", 1.20, 0.00, "09:00:00", "17:00:00", 10, True),
    ]
    for prid, wid, rtid, rid, name, mtype, mult, fixed, st, et, prio, active in pricing_rules:
        lines.append(
            f"INSERT INTO `pricing_rule` (`id`, `workspace_id`, `resource_type_id`, `resource_id`, `name`, `modifier_type`, "
            f"`multiplier`, `fixed_amount`, `start_time`, `end_time`, `priority`, `is_active`, `created_at`, `updated_at`) "
            f"VALUES ({prid}, {wid}, {sql_literal(rtid)}, {sql_literal(rid)}, {sql_literal(name)}, {sql_literal(mtype)}, "
            f"{mult}, {fixed}, {sql_literal(st)}, {sql_literal(et)}, {prio}, {sql_literal(active)}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `multiplier` = VALUES(`multiplier`), `is_active` = VALUES(`is_active`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    lines.append("\n-- 15. Discount Rules / Vouchers (`discount_rule`)")
    discounts = [
        (
            1,
            1,
            None,
            3,
            "NEXSPACE20",
            "Ưu đãi 20% trải nghiệm NexSpace Đà Nẵng",
            "Giảm 20% (tối đa 150.000đ) cho mọi đơn đặt bàn làm việc và phòng họp tại NexSpace Hải Châu.",
            "PERCENT",
            20.00,
            150000.00,
            90000.00,
            120,
            True,
            "ACTIVE",
            200,
            3,
        ),
        (
            2,
            None,
            None,
            1,
            "WELCOME50K",
            "Voucher chào mừng thành viên mới 50.000đ",
            "Giảm trực tiếp 50.000đ cho đơn đặt chỗ đầu tiên từ 150.000đ trên toàn hệ thống NexSpace.",
            "FIXED_AMOUNT",
            50000.00,
            50000.00,
            150000.00,
            60,
            True,
            "ACTIVE",
            500,
            1,
        ),
    ]
    for (
        drid,
        wid,
        rtid,
        cby,
        code,
        name,
        desc,
        dtype,
        dval,
        max_d,
        min_b,
        min_dur,
        is_pub,
        status,
        u_tot,
        u_cust,
    ) in discounts:
        lines.append(
            f"INSERT INTO `discount_rule` (`id`, `workspace_id`, `resource_type_id`, `created_by`, `code`, `name`, "
            f"`description`, `discount_type`, `discount_value`, `max_discount_amount`, `min_booking_amount`, "
            f"`min_duration_minutes`, `is_public`, `status`, `start_at`, `end_at`, `usage_limit_total`, "
            f"`usage_limit_per_customer`, `created_at`, `updated_at`) "
            f"VALUES ({drid}, {sql_literal(wid)}, {sql_literal(rtid)}, {cby}, {sql_literal(code)}, {sql_literal(name)}, "
            f"{sql_literal(desc)}, {sql_literal(dtype)}, {dval}, {max_d}, {min_b}, {min_dur}, {sql_literal(is_pub)}, "
            f"{sql_literal(status)}, DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 30 DAY), DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 90 DAY), "
            f"{u_tot}, {u_cust}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `discount_value` = VALUES(`discount_value`), `status` = VALUES(`status`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    lines.append("\n-- 16. Membership Plans & Subscriptions (`membership_plan`, `membership_subscription`)")
    lines.append(
        "INSERT INTO `membership_plan` (`id`, `organizer_id`, `workspace_id`, `name`, `applicable_category`, `quota_amount`, "
        "`quota_unit`, `price`, `validity_days`, `benefits_desc`, `is_active`, `created_at`, `updated_at`) VALUES "
        "(1, 3, 1, 'NexSpace Flex Pass 40 Giờ', 'DESK', 40.00, 'HOUR', 1450000.00, 30, "
        "'Sử dụng linh hoạt 40 giờ tại mọi bàn Hot Desk thuộc NexSpace Hải Châu, miễn phí cà phê Arabica & phòng телефон booth.', b'1', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)), "
        "(2, 3, 1, 'NexSpace Team Meeting Pack 20 Giờ', 'ROOM', 20.00, 'HOUR', 5500000.00, 60, "
        "'Gói 20 giờ sử dụng phòng họp Sông Hàn Boardroom & Focus Pod cho doanh nghiệp.', b'1', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
        "ON DUPLICATE KEY UPDATE `price` = VALUES(`price`), `updated_at` = UTC_TIMESTAMP(6);"
    )
    lines.append(
        "INSERT INTO `membership_subscription` (`id`, `customer_id`, `plan_id`, `status`, `price_paid`, `quota_total`, "
        "`quota_used`, `start_date`, `end_date`, `plan_snapshot`, `created_at`, `updated_at`) VALUES "
        "(1, 7, 1, 'ACTIVE', 1450000.00, 40.00, 8.00, DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 10 DAY), "
        "DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 20 DAY), "
        "'{\"planName\":\"NexSpace Flex Pass 40 Giờ\",\"quotaAmount\":40,\"quotaUnit\":\"HOUR\"}', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
        "ON DUPLICATE KEY UPDATE `quota_used` = VALUES(`quota_used`), `status` = VALUES(`status`), `updated_at` = UTC_TIMESTAMP(6);"
    )

    # -------------------------------------------------------------------------
    # 6. BOOKINGS, PAYMENTS, PAYOUTS, REFUNDS & REVIEWS
    # -------------------------------------------------------------------------
    lines.append("\n-- 17. Bookings (`booking`)")
    bookings = [
        # Booking 1: COMPLETED (Customer 7 Mai Đăng Huy at Workspace 1, Pro Desk DD-01)
        (
            1,
            "NXB-20261101-0001",
            7,
            1,
            4,
            1,
            "HOURLY",
            "DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 5 DAY)",
            "DATE_ADD(DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 5 DAY), INTERVAL 4 HOUR)",
            300000.00,
            0.00,
            0.00,
            60000.00,
            7500.00,
            19200.00,
            266700.00,
            30000.00,
            "COMPLETED",
            "SEARCH",
            "qr_hash_booking_0001_completed",
            3,
            "DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 5 DAY)",
            "DATE_ADD(DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 5 DAY), INTERVAL 4 HOUR)",
            1,
            None,
            None,
        ),
        # Booking 2: COMPLETED (Customer 8 Nguyễn Kim Đăng Khoa at Workspace 1, Boardroom MR-01)
        (
            2,
            "NXB-20261103-0002",
            8,
            1,
            6,
            10,
            "HOURLY",
            "DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 3 DAY)",
            "DATE_ADD(DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 3 DAY), INTERVAL 3 HOUR)",
            1050000.00,
            0.00,
            0.00,
            0.00,
            26250.00,
            84000.00,
            1160250.00,
            105000.00,
            "COMPLETED",
            "RECOMMENDATION",
            "qr_hash_booking_0002_completed",
            3,
            "DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 3 DAY)",
            "DATE_ADD(DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 3 DAY), INTERVAL 3 HOUR)",
            None,
            None,
            None,
        ),
        # Booking 3: CONFIRMED Upcoming (Customer 7 Mai Đăng Huy at Workspace 3, Saigon Boardroom VIP)
        (
            3,
            "NXB-20261110-0003",
            7,
            3,
            13,
            12,
            "HOURLY",
            "DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 1 DAY)",
            "DATE_ADD(UTC_TIMESTAMP(6), INTERVAL '1 2' DAY_HOUR)",
            1100000.00,
            0.00,
            0.00,
            50000.00,
            27500.00,
            84000.00,
            1161500.00,
            110000.00,
            "CONFIRMED",
            "DIRECT",
            "qr_hash_booking_0003_confirmed",
            None,
            "NULL",
            "NULL",
            2,
            None,
            None,
        ),
        # Booking 4: CANCELLED with Refund Request (Customer 9 Nguyễn Huy Vũ at Workspace 2, Podcast Studio ST-01)
        (
            4,
            "NXB-20261108-0004",
            9,
            2,
            11,
            3,
            "HOURLY",
            "DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 2 DAY)",
            "DATE_ADD(UTC_TIMESTAMP(6), INTERVAL '2 2' DAY_HOUR)",
            840000.00,
            0.00,
            0.00,
            0.00,
            21000.00,
            67200.00,
            928200.00,
            84000.00,
            "CANCELLED",
            "SEARCH",
            "qr_hash_booking_0004_cancelled",
            None,
            "NULL",
            "NULL",
            None,
            "CUSTOMER",
            "Lịch quay hình cùng khách mời thay đổi đột xuất, xin phép hủy trước 48 giờ theo chính sách hoàn 100%.",
        ),
    ]
    for (
        bk_id,
        bcode,
        cid,
        wid,
        rid,
        psize,
        ptype,
        st_expr,
        et_expr,
        base_amt,
        sur_amt,
        add_amt,
        disc_amt,
        sfee,
        tax,
        final_p,
        pfee,
        status,
        src,
        qr_hash,
        chk_by,
        chk_in_expr,
        chk_out_expr,
        disc_id,
        c_src,
        c_reason,
    ) in bookings:
        canc_at = "UTC_TIMESTAMP(6)" if status == "CANCELLED" else "NULL"
        lines.append(
            f"INSERT INTO `booking` (`id`, `booking_code`, `customer_id`, `workspace_id`, `resource_id`, `party_size`, "
            f"`price_type`, `start_time`, `end_time`, `base_amount`, `surcharge_amount`, `addon_amount`, "
            f"`discount_amount`, `service_fee_amount`, `tax_amount`, `final_price`, `platform_fee_amount`, "
            f"`quota_used_amount`, `status`, `source`, `qr_token_hash`, `checked_in_by`, `checked_in_at`, "
            f"`checked_out_at`, `discount_rule_id`, `cancel_source`, `cancel_reason`, `cancelled_at`, "
            f"`pricing_snapshot`, `cancellation_policy_snapshot`, `created_at`, `updated_at`) "
            f"VALUES ({bk_id}, {sql_literal(bcode)}, {cid}, {wid}, {rid}, {psize}, {sql_literal(ptype)}, "
            f"{st_expr}, {et_expr}, {base_amt}, {sur_amt}, {add_amt}, {disc_amt}, {sfee}, {tax}, {final_p}, {pfee}, "
            f"0.00, {sql_literal(status)}, {sql_literal(src)}, {sql_literal(qr_hash)}, {sql_literal(chk_by)}, "
            f"{chk_in_expr}, {chk_out_expr}, {sql_literal(disc_id)}, {sql_literal(c_src)}, {sql_literal(c_reason)}, "
            f"{canc_at}, '{{\"currency\":\"VND\"}}', '{{\"refund24h\":100,\"refund6h\":50}}', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `final_price` = VALUES(`final_price`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    lines.append("\n-- 18. Payment Transactions (`payment_transaction`)")
    payments = [
        (1, 1, None, 2611010001, 266700.00, 266700.00, "SUCCESS", "MATCHED", "PAYOS-TX-20261101-01", "Đối soát tự động khớp 100% qua webhook PayOS."),
        (2, 2, None, 2611030002, 1160250.00, 1160250.00, "SUCCESS", "MATCHED", "PAYOS-TX-20261103-02", "Đối soát tự động khớp 100% qua webhook PayOS."),
        (3, 3, None, 2611100003, 1161500.00, 1161500.00, "SUCCESS", "MATCHED", "PAYOS-TX-20261110-03", "Thanh toán thành công qua VietQR PayOS."),
        (4, 4, None, 2611080004, 928200.00, 928200.00, "SUCCESS", "MATCHED", "PAYOS-TX-20261108-04", "Đơn đã thanh toán, đang xử lý yêu cầu hoàn tiền hợp lệ."),
        (5, None, 1, 2611010005, 1450000.00, 1450000.00, "SUCCESS", "MATCHED", "PAYOS-TX-20261101-05", "Thanh toán gói hội viên NexSpace Flex Pass 40 Giờ."),
    ]
    for ptid, bkid, subid, ocode, amt, rec_amt, status, rec_st, gw_id, note in payments:
        lines.append(
            f"INSERT INTO `payment_transaction` (`id`, `booking_id`, `subscription_id`, `order_code`, `amount`, "
            f"`received_amount`, `status`, `reconciliation_status`, `gateway_transaction_id`, `reconciliation_note`, "
            f"`paid_at`, `created_at`, `updated_at`) "
            f"VALUES ({ptid}, {sql_literal(bkid)}, {sql_literal(subid)}, {ocode}, {amt}, {rec_amt}, "
            f"{sql_literal(status)}, {sql_literal(rec_st)}, {sql_literal(gw_id)}, {sql_literal(note)}, "
            f"UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
            f"ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `reconciliation_status` = VALUES(`reconciliation_status`), `updated_at` = UTC_TIMESTAMP(6);"
        )

    lines.append("\n-- 19. Organizer Payouts (`organizer_payout`)")
    lines.append(
        "INSERT INTO `organizer_payout` (`id`, `booking_id`, `organizer_id`, `gross_amount`, `platform_fee_amount`, "
        "`refund_deduction_amount`, `payout_amount`, `status`, `payout_reference`, `eligible_at`, `paid_at`, `created_at`, `updated_at`) VALUES "
        "(1, 1, 3, 266700.00, 30000.00, 0.00, 236700.00, 'PAID', 'VCB-PAYOUT-20261105-001', DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 4 DAY), DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 3 DAY), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)), "
        "(2, 2, 3, 1160250.00, 105000.00, 0.00, 1055250.00, 'RELEASED', 'VCB-PAYOUT-20261107-002', DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 2 DAY), NULL, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
        "ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `payout_amount` = VALUES(`payout_amount`), `updated_at` = UTC_TIMESTAMP(6);"
    )

    lines.append("\n-- 20. Refund Requests (`refund_request`)")
    lines.append(
        "INSERT INTO `refund_request` (`id`, `booking_id`, `payment_transaction_id`, `requested_by`, `reviewed_by`, "
        "`source`, `status`, `requested_amount`, `approved_amount`, `reason`, `admin_note`, `refund_reference`, "
        "`reviewed_at`, `processed_at`, `created_at`, `updated_at`) VALUES "
        "(1, 4, 4, 9, 1, 'CUSTOMER_CANCEL', 'PROCESSED', 928200.00, 928200.00, "
        "'Hủy đặt phòng thu ST-01 trước 48 giờ theo quy định hoàn tiền 100%.', "
        "'Khách hủy đúng hạn >24h, duyệt hoàn 100% giá trị thanh toán.', 'REF-PAYOS-20261108-001', "
        "UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
        "ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `approved_amount` = VALUES(`approved_amount`), `updated_at` = UTC_TIMESTAMP(6);"
    )

    lines.append("\n-- 21. Customer Reviews & Reactions (`customer_review`, `review_reaction`)")
    lines.append(
        "INSERT INTO `customer_review` (`id`, `booking_id`, `workspace_id`, `rating`, `content`, `dimension_ratings`, "
        "`organizer_reply`, `replied_at`, `status`, `created_at`, `updated_at`) VALUES "
        "(1, 1, 1, 5, 'Trạm làm việc 2 màn hình 4K tại NexSpace Hải Châu cực kỳ mượt mà, ghế Herman Miller ngồi 8 tiếng không mỏi lưng. Cà phê Arabica miễn phí ở quầy bar rất thơm!', "
        "'{\"wifi\":5,\"cleanliness\":5,\"comfort\":5,\"Location\":5,\"value\":5}', "
        "'Cảm ơn bạn Đăng Huy đã tin tưởng lựa chọn NexSpace Hải Châu! Hẹn gặp lại bạn trong những phiên làm việc tiếp theo nhé.', "
        "UTC_TIMESTAMP(6), 'PUBLISHED', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)), "
        "(2, 2, 1, 5, 'Phòng họp Sông Hàn Boardroom cách âm tuyệt vời, màn hình 75-inch và camera hội nghị Poly giúp buổi thuyết trình với đối tác Singapore diễn ra hoàn hảo.', "
        "'{\"wifi\":5,\"cleanliness\":5,\"comfort\":5,\"Location\":5,\"value\":5}', "
        "'NexSpace rất vui khi đồng hành cùng buổi họp chiến lược của đội ngũ bạn Khoa!', "
        "UTC_TIMESTAMP(6), 'PUBLISHED', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
        "ON DUPLICATE KEY UPDATE `rating` = VALUES(`rating`), `content` = VALUES(`content`), `status` = VALUES(`status`), `updated_at` = UTC_TIMESTAMP(6);"
    )
    lines.append(
        "INSERT IGNORE INTO `review_reaction` (`customer_id`, `review_id`, `created_at`) VALUES "
        "(8, 1, UTC_TIMESTAMP(6)), "
        "(7, 2, UTC_TIMESTAMP(6));"
    )

    # -------------------------------------------------------------------------
    # 7. PERSONALIZATION, SUPPORT CASES, NOTIFICATIONS & AUDIT LOGS
    # -------------------------------------------------------------------------
    lines.append("\n-- 22. Favorite Workspaces, Saved Filters & Recommendations")
    lines.append(
        "INSERT IGNORE INTO `favorite_workspace` (`customer_id`, `workspace_id`, `group_name`, `created_at`) VALUES "
        "(7, 1, 'Không gian làm việc Đà Nẵng yêu thích', UTC_TIMESTAMP(6)), "
        "(7, 3, 'Văn phòng công tác TP.HCM', UTC_TIMESTAMP(6)), "
        "(8, 1, 'Phòng họp nhóm', UTC_TIMESTAMP(6)), "
        "(10, 4, 'Góc sáng tạo Hà Nội', UTC_TIMESTAMP(6));"
    )
    lines.append(
        "INSERT INTO `saved_search_filter` (`id`, `customer_id`, `name`, `criteria_json`, `created_at`, `updated_at`) VALUES "
        "(1, 7, 'Bàn 2 màn hình yên tĩnh Hải Châu', '{\"city\":\"Đà Nẵng\",\"district\":\"Quận Hải Châu\",\"category\":\"COWORKING_HUB\",\"noiseLevel\":\"QUIET\",\"amenities\":[1,4,6]}', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)), "
        "(2, 8, 'Phòng họp 10-16 người trung tâm', '{\"resourceCategory\":\"ROOM\",\"minCapacity\":10,\"amenities\":[1,3,11]}', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
        "ON DUPLICATE KEY UPDATE `criteria_json` = VALUES(`criteria_json`), `updated_at` = UTC_TIMESTAMP(6);"
    )
    lines.append(
        "INSERT INTO `recommendation_event` (`id`, `customer_id`, `workspace_id`, `booking_id`, `event_type`, `rank_position`, `request_key`, `occurred_at`, `updated_at`) VALUES "
        "(1, 7, 1, 1, 'BOOKING', 1, 'req-rec-danang-001', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)), "
        "(2, 8, 1, 2, 'BOOKING', 1, 'req-rec-danang-002', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)), "
        "(3, 7, 3, 3, 'CLICK', 2, 'req-rec-hcm-001', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
        "ON DUPLICATE KEY UPDATE `event_type` = VALUES(`event_type`), `updated_at` = UTC_TIMESTAMP(6);"
    )

    lines.append("\n-- 23. Support Cases & Messages (`support_case`, `support_case_message`)")
    lines.append(
        "INSERT INTO `support_case` (`id`, `case_code`, `case_type`, `category`, `priority`, `status`, `target_entity`, "
        "`target_id`, `booking_id`, `reporter_id`, `assigned_to`, `resolved_by`, `reason`, `resolution_action`, "
        "`resolution_note`, `resolved_at`, `created_at`, `updated_at`) VALUES "
        "(1, 'SUP-20261108-001', 'COMPLAINT_DISPUTE', 'PAYMENT_ISSUE', 'NORMAL', 'RESOLVED', 'BOOKING', 4, 4, 9, 1, 1, "
        "'Nhờ hỗ trợ kiểm tra tiến độ hoàn tiền đơn đặt phòng thu #NXB-20261108-0004.', 'APPROVE_REFUND', "
        "'Đã đối soát giao dịch PayOS #2611080004 và hoàn tất chuyển khoản hoàn tiền 100% cho khách hàng.', "
        "UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
        "ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `resolution_note` = VALUES(`resolution_note`), `updated_at` = UTC_TIMESTAMP(6);"
    )
    lines.append(
        "INSERT INTO `support_case_message` (`id`, `support_case_id`, `sender_id`, `is_internal`, `body`, `created_at`, `updated_at`) VALUES "
        "(1, 1, 9, b'0', 'Chào Admin, mình đã hủy đơn #NXB-20261108-0004 trước 48h, nhờ bộ phận thanh toán kiểm tra giúp mình nhé.', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)), "
        "(2, 1, 1, b'0', 'Chào bạn Huy Vũ, Ban quản trị NexSpace đã phê duyệt lệnh hoàn tiền 928.200đ (mã tham chiếu REF-PAYOS-20261108-001).', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
        "ON DUPLICATE KEY UPDATE `body` = VALUES(`body`), `updated_at` = UTC_TIMESTAMP(6);"
    )

    lines.append("\n-- 24. User Notifications (`user_notification`)")
    lines.append(
        "INSERT INTO `user_notification` (`id`, `user_id`, `type`, `title`, `content`, `related_entity_type`, `related_entity_id`, "
        "`is_read`, `email_status`, `push_status`, `retry_count`, `created_at`, `updated_at`) VALUES "
        "(1, 3, 'ORGANIZER_APPLICATION', 'Hồ sơ đối tác NexSpace Việt Nam đã được phê duyệt', "
        "'Chúc mừng! Hồ sơ pháp lý Công ty CP Không Gian Làm Việc NexSpace Việt Nam đã được phê duyệt.', 'ORGANIZER_PROFILE', 1, b'1', 'SENT', 'SENT', 0, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)), "
        "(2, 7, 'BOOKING', 'Xác nhận đặt chỗ #NXB-20261110-0003 thành công', "
        "'Phòng họp Saigon Boardroom VIP tại NexSpace Saigon Prime Center Quận 1 đã sẵn sàng đón bạn.', 'BOOKING', 3, b'0', 'SENT', 'SENT', 0, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)), "
        "(3, 6, 'ORGANIZER_APPLICATION', 'Yêu cầu bổ sung tài liệu KYC đối tác ThinkSpace', "
        "'Ban quản trị NexSpace đề nghị tải lại ảnh mặt trước CCCD rõ nét hơn.', 'ORGANIZER_PROFILE', 4, b'0', 'SENT', 'PENDING', 0, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
        "ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `content` = VALUES(`content`), `updated_at` = UTC_TIMESTAMP(6);"
    )

    lines.append("\n-- 25. Immutable Governance Audit Logs (`audit_log`)")
    lines.append(
        "INSERT INTO `audit_log` (`id`, `user_id`, `actor_type`, `module`, `action`, `entity_type`, `entity_id`, "
        "`old_value`, `new_value`, `reason`, `ip_address`, `created_at`, `updated_at`) VALUES "
        "(1, 1, 'USER', 'ORGANIZER', 'APPROVE_ORGANIZER_PROFILE', 'ORGANIZER_PROFILE', 1, "
        "'{\"status\":\"PENDING_REVIEW\"}', '{\"status\":\"APPROVED\",\"role\":\"ORGANIZER\"}', "
        "'Hồ sơ pháp lý doanh nghiệp, giấy phép ĐKKD và chứng nhận thuế hợp lệ.', '127.0.0.1', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)), "
        "(2, 1, 'USER', 'ORGANIZER', 'APPROVE_ORGANIZER_PROFILE', 'ORGANIZER_PROFILE', 2, "
        "'{\"status\":\"PENDING_REVIEW\"}', '{\"status\":\"APPROVED\",\"role\":\"ORGANIZER\"}', "
        "'Đã xác minh giấy phép ĐKKD và tài khoản ngân hàng doanh nghiệp Toong.', '127.0.0.1', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)), "
        "(3, 2, 'USER', 'ORGANIZER', 'REQUEST_ORGANIZER_REVISION', 'ORGANIZER_PROFILE', 4, "
        "'{\"status\":\"PENDING_REVIEW\"}', '{\"status\":\"REVISION_REQUESTED\"}', "
        "'Yêu cầu bổ sung ảnh CCCD mặt trước rõ nét hơn.', '127.0.0.1', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)), "
        "(4, 1, 'USER', 'WORKSPACE', 'APPROVE_WORKSPACE', 'WORKSPACE', 1, "
        "'{\"status\":\"PENDING_REVIEW\"}', '{\"status\":\"ACTIVE\",\"isListingVisible\":true}', "
        "'Không gian đạt chuẩn chất lượng 5 sao của NexSpace.', '127.0.0.1', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)) "
        "ON DUPLICATE KEY UPDATE `reason` = VALUES(`reason`), `updated_at` = UTC_TIMESTAMP(6);"
    )

    lines.append("\nSET FOREIGN_KEY_CHECKS = 1;\n")
    return "\n".join(lines)


def initialize_database(mode: str = "full", clear_first: bool = False) -> None:
    cfg = load_db_config()
    db = DatabaseExecutor(cfg)

    print("=" * 72)
    print(f" NexSpace Database Initializer — Target: {cfg.host}:{cfg.port}/{cfg.database}")
    print(f" Driver Mode: {db.mode} | Seed Mode: {mode} | Clear First: {clear_first}")
    print("=" * 72)

    # 1. Ensure schema exists
    existing_tables = db.list_tables()
    if len(existing_tables) < 40:
        mig_files = get_sorted_migration_files()
        if mig_files:
            print(f"-> Phát hiện database chỉ có {len(existing_tables)} bảng. Đang chạy {len(mig_files)} file migration...")
            for mf in mig_files:
                print(f"   + Thực thi `{mf.name}`...")
                db.execute_sql_script(mf.read_text(encoding="utf-8"))
            existing_tables = db.list_tables()
            print(f"   [OK] Schema đã sẵn sàng ({len(existing_tables)} bảng).")

    # 2. Optional clear first
    if clear_first:
        clear_database(mode="all", executor=db)

    # 3. Seed Master Data
    seed_master_data(executor=db)

    # 4. Seed Accounts & KYC
    seed_accounts(executor=db)

    # 5. Seed Full Business Ecosystem
    if mode == "full":
        print("-> Đang khởi tạo dữ liệu nghiệp vụ NexSpace (Workspaces, Floor Plans, Resources, Bookings, Payments, Reviews)...")
        db.execute_sql_script(build_business_ecosystem_sql())
        biz_tables = [
            "building",
            "building_floor",
            "workspace",
            "workspace_operating_hour",
            "workspace_cancellation_rule",
            "workspace_amenity",
            "media",
            "floor_plan",
            "resource_type",
            "bookable_resource",
            "workspace_asset",
            "pricing_rule",
            "discount_rule",
            "membership_plan",
            "membership_subscription",
            "booking",
            "payment_transaction",
            "organizer_payout",
            "refund_request",
            "customer_review",
            "support_case",
            "audit_log",
        ]
        counts = db.get_table_counts(biz_tables)
        print("   [OK] Hoàn tất dữ liệu nghiệp vụ NexSpace:")
        for tbl, cnt in counts.items():
            print(f"        - {tbl:<28}: {cnt} bản ghi")

    print("\n" + "=" * 72)
    print(" TÀI KHOẢN ĐĂNG NHẬP MẪU (SEEDED ACCOUNTS):")
    print("-" * 72)
    print(f" 1. ADMIN     : admin@nexspace.vn             | Mật khẩu: {cfg.admin_password}")
    print(f" 2. ORGANIZER : organizer@nexspace.vn         | Mật khẩu: {cfg.organizer_password} (APPROVED)")
    print(f" 3. ORGANIZER : partner.toong@nexspace.vn     | Mật khẩu: {cfg.organizer_password} (APPROVED)")
    print(f" 4. APPLICANT : partner.dreamplex@nexspace.vn | Mật khẩu: {cfg.organizer_password} (PENDING_REVIEW)")
    print(f" 5. APPLICANT : partner.thinkspace@nexspace.vn| Mật khẩu: {cfg.organizer_password} (REVISION_REQUESTED)")
    print(f" 6. CUSTOMER  : customer@nexspace.vn          | Mật khẩu: {cfg.customer_password}")
    print(f" 7. CUSTOMER  : khoa.nguyen@nexspace.vn       | Mật khẩu: {cfg.customer_password}")
    print("=" * 72)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Khởi tạo dữ liệu chuẩn nghiệp vụ cho dự án NexSpace (Master Data + Accounts + Business Data)."
    )
    parser.add_argument(
        "--mode",
        choices=["full", "master"],
        default="full",
        help="Chế độ seed: 'full' (đầy đủ Master + Accounts + Workspaces + Bookings), 'master' (chỉ Master + Accounts).",
    )
    parser.add_argument(
        "--clear-first",
        action="store_true",
        help="Làm sạch toàn bộ dữ liệu cũ trong các bảng trước khi nạp dữ liệu chuẩn mới.",
    )
    args = parser.parse_args()
    initialize_database(mode=args.mode, clear_first=args.clear_first)


if __name__ == "__main__":
    main()

