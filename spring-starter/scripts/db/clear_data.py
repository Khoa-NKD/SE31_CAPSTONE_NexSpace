#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NexSpace Database Clear Utility (`clear_data.py`)
=================================================
Safely clears data in the NexSpace MySQL database while preserving schema integrity.

Modes (`--mode`):
  - `all` (default) : Truncates all 44 domain tables and resets AUTO_INCREMENT = 1
                      (preserves `flyway_schema_history` migration table).
  - `keep-master`   : Clears business/transactional tables while preserving master
                      catalogs (`roles`, `business_type`, `amenity`, `platform_setting`,
                      `notification_template`). Combine with `--keep-accounts` to also
                      preserve `users`, `organizer_profile`, `organizer_document`, and
                      `customer_preference`.
  - `drop-all`      : Drops all tables in the database (including `flyway_schema_history`)
                      and optionally re-applies `V1__init_schema.sql` (`--recreate-schema`).

Usage:
  python3 spring-starter/scripts/db/clear_data.py --yes
  python3 spring-starter/scripts/db/clear_data.py --mode keep-master --keep-accounts --yes
  python3 spring-starter/scripts/db/clear_data.py --mode drop-all --recreate-schema --yes
"""

from __future__ import annotations

import argparse
from typing import List, Set

from db_helper import DatabaseExecutor, get_sorted_migration_files, load_db_config

# Master catalog tables
MASTER_TABLES: Set[str] = {
    "roles",
    "business_type",
    "amenity",
    "platform_setting",
    "notification_template",
}

# Core account & KYC tables
ACCOUNT_TABLES: Set[str] = {
    "users",
    "organizer_profile",
    "organizer_document",
    "customer_preference",
}

# Protected migration metadata table
MIGRATION_METADATA_TABLES: Set[str] = {
    "flyway_schema_history",
}


def clear_database(
    mode: str = "all",
    keep_accounts: bool = False,
    recreate_schema: bool = False,
    executor: DatabaseExecutor | None = None,
) -> None:
    cfg = load_db_config()
    db = executor or DatabaseExecutor(cfg)

    existing_tables = db.list_tables()
    if not existing_tables:
        print(f"Database `{cfg.database}` hiện đang trống (0 bảng).")
        if recreate_schema:
            for mig_file in get_sorted_migration_files():
                print(f"-> Đang chạy khởi tạo schema từ `{mig_file.name}`...")
                db.execute_sql_script(mig_file.read_text(encoding="utf-8"))
            print("   [OK] Đã tạo lại toàn bộ bảng từ thư mục db/migration.")
        return

    if mode == "drop-all":
        print(f"-> Đang DROP toàn bộ {len(existing_tables)} bảng trong database `{cfg.database}`...")
        drop_lines = ["SET FOREIGN_KEY_CHECKS = 0;"]
        for tbl in existing_tables:
            drop_lines.append(f"DROP TABLE IF EXISTS `{tbl}`;")
        drop_lines.append("SET FOREIGN_KEY_CHECKS = 1;")
        db.execute_sql_script("\n".join(drop_lines))
        print(f"   [OK] Đã xóa toàn bộ {len(existing_tables)} bảng.")

        if recreate_schema:
            for mig_file in get_sorted_migration_files():
                print(f"-> Đang chạy migration `{mig_file.name}`...")
                db.execute_sql_script(mig_file.read_text(encoding="utf-8"))
            new_tables = db.list_tables()
            print(f"   [OK] Đã khởi tạo lại {len(new_tables)} bảng từ tất cả các file migration.")
        return

    # Determine which tables to preserve
    preserved: Set[str] = set(MIGRATION_METADATA_TABLES)
    if mode == "keep-master":
        preserved.update(MASTER_TABLES)
        if keep_accounts:
            preserved.update(ACCOUNT_TABLES)

    tables_to_clear: List[str] = [t for t in existing_tables if t not in preserved]

    print(
        f"-> Đang xóa dữ liệu ({len(tables_to_clear)} bảng) trên `{cfg.host}:{cfg.port}/{cfg.database}` "
        f"[mode={mode}, keep_accounts={keep_accounts}]..."
    )

    sql_lines = ["SET FOREIGN_KEY_CHECKS = 0;"]
    for tbl in tables_to_clear:
        sql_lines.append(f"TRUNCATE TABLE `{tbl}`;")
    sql_lines.append("SET FOREIGN_KEY_CHECKS = 1;")

    db.execute_sql_script("\n".join(sql_lines))

    after_counts = db.get_table_counts(existing_tables)
    non_empty = {t: c for t, c in after_counts.items() if c > 0 and t not in MIGRATION_METADATA_TABLES}
    print(f"   [OK] Đã làm sạch {len(tables_to_clear)} bảng (AUTO_INCREMENT đã reset về 1).")
    if non_empty:
        print("   Các bảng được giữ lại dữ liệu:")
        for tbl, cnt in sorted(non_empty.items()):
            print(f"     - {tbl:<26}: {cnt} bản ghi")
    else:
        print("   Tất cả các bảng dữ liệu nghiệp vụ hiện đang có 0 bản ghi.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Công cụ xóa dữ liệu (clear/reset data) cho database NexSpace."
    )
    parser.add_argument(
        "--mode",
        choices=["all", "keep-master", "drop-all"],
        default="all",
        help="Chế độ xóa: 'all' (xóa sạch dữ liệu 44 bảng), 'keep-master' (giữ bảng master), 'drop-all' (drop toàn bộ bảng).",
    )
    parser.add_argument(
        "--keep-accounts",
        action="store_true",
        help="Khi dùng cùng --mode keep-master, giữ lại bảng users, organizer_profile, organizer_document, customer_preference.",
    )
    parser.add_argument(
        "--recreate-schema",
        action="store_true",
        help="Khi dùng cùng --mode drop-all, tự động chạy lại V1__init_schema.sql sau khi drop.",
    )
    parser.add_argument(
        "-y",
        "--yes",
        action="store_true",
        help="Bỏ qua bước hỏi xác nhận (dành cho script tự động / CI).",
    )
    args = parser.parse_args()

    cfg = load_db_config()
    if not args.yes:
        prompt = (
            f"Bạn có chắc chắn muốn xóa dữ liệu database `{cfg.database}` tại `{cfg.host}:{cfg.port}` "
            f"(mode={args.mode})? [y/N]: "
        )
        ans = input(prompt).strip().lower()
        if ans not in ("y", "yes"):
            print("Đã hủy thao tác.")
            return

    clear_database(
        mode=args.mode,
        keep_accounts=args.keep_accounts,
        recreate_schema=args.recreate_schema,
    )


if __name__ == "__main__":
    main()

