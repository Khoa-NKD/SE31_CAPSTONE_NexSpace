#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NexSpace Auto-Migration Generator (`make_migration.py`)
=======================================================
Inspects the current live MySQL database schema (`SHOW CREATE TABLE` across all
tables, excluding data) and compares it against the cumulative schema defined in
`src/main/resources/db/migration/V*.sql`.

Automatically detects:
  1. New tables (`CREATE TABLE IF NOT EXISTS ...`)
  2. Added columns (`ALTER TABLE ... ADD COLUMN ...`)
  3. Modified column definitions (`ALTER TABLE ... MODIFY COLUMN ...`)
  4. Added unique keys / indexes (`ALTER TABLE ... ADD UNIQUE KEY / ADD KEY ...`)
  5. Added foreign key constraints (`ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...`)
  6. Dropped columns (`ALTER TABLE ... DROP COLUMN ...` when `--include-drops` is passed)

And writes a new versioned Flyway migration file:
  `src/main/resources/db/migration/V<next_version>__<description>.sql`

Usage:
  # Tự động phát hiện thay đổi schema và sinh file V2__<mo_ta>.sql
  python3 spring-starter/scripts/db/make_migration.py -m "add_checkin_note_to_booking"

  # Tự động đặt tên file theo bảng/cột thay đổi nếu không truyền -m
  python3 spring-starter/scripts/db/make_migration.py

  # Chỉ xem trước câu lệnh SQL sẽ sinh ra (không tạo file)
  python3 spring-starter/scripts/db/make_migration.py --dry-run
"""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from db_helper import (
    MIGRATION_DIR,
    DatabaseExecutor,
    get_sorted_migration_files,
    load_db_config,
)

IGNORED_TABLES = {"flyway_schema_history"}


@dataclass
class TableSchema:
    name: str
    raw_create_sql: str = ""
    columns: Dict[str, str] = field(default_factory=dict)  # col_name -> normalized definition
    raw_columns: Dict[str, str] = field(default_factory=dict)  # col_name -> exact DDL fragment
    indexes: Dict[str, str] = field(default_factory=dict)  # index_name -> exact DDL fragment
    foreign_keys: Dict[str, str] = field(default_factory=dict)  # fk_name -> exact DDL fragment


def _normalize_col_def(col_def: str) -> str:
    """Normalizes a MySQL column definition for reliable comparison."""
    s = col_def.strip().rstrip(",")
    # Normalize whitespace
    s = re.sub(r"\s+", " ", s)
    # Remove explicit COLLATE clauses (MySQL SHOW CREATE TABLE adds COLLATE utf8mb4_general_ci)
    s = re.sub(r"\s+COLLATE\s+[a-zA-Z0-9_]+", "", s, flags=re.IGNORECASE)
    # Remove CHARACTER SET clauses
    s = re.sub(r"\s+CHARACTER\s+SET\s+[a-zA-Z0-9_]+", "", s, flags=re.IGNORECASE)
    # Normalize int(11) / bigint(20) / tinyint(4) display widths
    s = re.sub(r"\bbigint\(\d+\)", "bigint", s, flags=re.IGNORECASE)
    s = re.sub(r"\bint\(\d+\)", "int", s, flags=re.IGNORECASE)
    s = re.sub(r"\btinyint\(\d+\)", "tinyint", s, flags=re.IGNORECASE)
    # Normalize DEFAULT '0' vs DEFAULT 0 for numeric types
    s = re.sub(r"DEFAULT\s+'(-?\d+(?:\.\d+)?)'", r"DEFAULT \1", s, flags=re.IGNORECASE)
    # Normalize NULL DEFAULT NULL -> DEFAULT NULL
    s = re.sub(r"\bNULL\s+DEFAULT\s+NULL\b", "DEFAULT NULL", s, flags=re.IGNORECASE)
    return s.lower().strip()


def _parse_create_table_block(table_name: str, create_sql: str) -> TableSchema:
    schema = TableSchema(name=table_name, raw_create_sql=create_sql)
    # Extract body inside first '(' and last ')'
    first_paren = create_sql.find("(")
    last_paren = create_sql.rfind(")")
    if first_paren == -1 or last_paren == -1 or last_paren <= first_paren:
        return schema

    body = create_sql[first_paren + 1 : last_paren]
    for raw_line in body.splitlines():
        line = raw_line.strip().rstrip(",")
        if not line or line.startswith("--"):
            continue

        # 1. Column line: starts with `col_name` or col_name (not PRIMARY, UNIQUE, KEY, INDEX, CONSTRAINT)
        col_match = re.match(r"^`?([a-zA-Z0-9_]+)`?\s+(.+)$", line)
        upper_line = line.upper()
        if (
            col_match
            and not upper_line.startswith("PRIMARY KEY")
            and not upper_line.startswith("UNIQUE KEY")
            and not upper_line.startswith("UNIQUE INDEX")
            and not upper_line.startswith("KEY ")
            and not upper_line.startswith("INDEX ")
            and not upper_line.startswith("CONSTRAINT ")
            and not upper_line.startswith("CHECK ")
        ):
            col_name = col_match.group(1)
            col_def = col_match.group(2).strip()
            schema.raw_columns[col_name] = f"`{col_name}` {col_def}"
            schema.columns[col_name] = _normalize_col_def(col_def)
            continue

        # 2. Index / Unique Key
        idx_match = re.match(
            r"^(UNIQUE\s+KEY|UNIQUE\s+INDEX|KEY|INDEX)\s+`?([a-zA-Z0-9_]+)`?\s*(.+)$",
            line,
            flags=re.IGNORECASE,
        )
        if idx_match:
            idx_type = idx_match.group(1).upper()
            if "UNIQUE" in idx_type:
                idx_type = "UNIQUE KEY"
            else:
                idx_type = "KEY"
            idx_name = idx_match.group(2)
            idx_rest = idx_match.group(3).strip()
            schema.indexes[idx_name] = f"{idx_type} `{idx_name}` {idx_rest}"
            continue

        # 3. Foreign Key Constraint
        fk_match = re.match(
            r"^CONSTRAINT\s+`?([a-zA-Z0-9_]+)`?\s+FOREIGN\s+KEY\s+(.+)$",
            line,
            flags=re.IGNORECASE,
        )
        if fk_match:
            fk_name = fk_match.group(1)
            fk_rest = fk_match.group(2).strip()
            schema.foreign_keys[fk_name] = f"CONSTRAINT `{fk_name}` FOREIGN KEY {fk_rest}"
            continue

    return schema


def load_migration_history_schemas() -> Dict[str, TableSchema]:
    """Parses all existing V*.sql files in db/migration/ to build the baseline schema state."""
    schemas: Dict[str, TableSchema] = {}
    mig_files = get_sorted_migration_files()

    create_pattern = re.compile(
        r"CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?([a-zA-Z0-9_]+)`?\s*\((.*?)\)\s*ENGINE=[^;]+;",
        flags=re.IGNORECASE | re.DOTALL,
    )

    for mf in mig_files:
        content = mf.read_text(encoding="utf-8")

        # 1. Process CREATE TABLE blocks
        for match in create_pattern.finditer(content):
            tname = match.group(1)
            full_stmt = match.group(0)
            schemas[tname] = _parse_create_table_block(tname, full_stmt)

        # 2. Process ALTER TABLE statements in subsequent V2, V3... migrations
        alter_pattern = re.compile(
            r"ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?\s+([^;]+);",
            flags=re.IGNORECASE | re.DOTALL,
        )
        for amatch in alter_pattern.finditer(content):
            tname = amatch.group(1)
            if tname not in schemas:
                schemas[tname] = TableSchema(name=tname)
            tschema = schemas[tname]
            ops_str = amatch.group(2).strip()

            # ADD COLUMN
            for add_col in re.finditer(
                r"ADD\s+(?:COLUMN\s+)?`?([a-zA-Z0-9_]+)`?\s+([^,]+)",
                ops_str,
                flags=re.IGNORECASE,
            ):
                cname = add_col.group(1)
                if cname.upper() in ("CONSTRAINT", "INDEX", "KEY", "UNIQUE", "FOREIGN"):
                    continue
                cdef = add_col.group(2).strip()
                tschema.raw_columns[cname] = f"`{cname}` {cdef}"
                tschema.columns[cname] = _normalize_col_def(cdef)

            # MODIFY COLUMN
            for mod_col in re.finditer(
                r"MODIFY\s+(?:COLUMN\s+)?`?([a-zA-Z0-9_]+)`?\s+([^,]+)",
                ops_str,
                flags=re.IGNORECASE,
            ):
                cname = mod_col.group(1)
                cdef = mod_col.group(2).strip()
                tschema.raw_columns[cname] = f"`{cname}` {cdef}"
                tschema.columns[cname] = _normalize_col_def(cdef)

            # DROP COLUMN
            for drop_col in re.finditer(
                r"DROP\s+(?:COLUMN\s+)?`?([a-zA-Z0-9_]+)`?",
                ops_str,
                flags=re.IGNORECASE,
            ):
                cname = drop_col.group(1)
                tschema.raw_columns.pop(cname, None)
                tschema.columns.pop(cname, None)

            # ADD UNIQUE KEY / KEY / INDEX
            for add_idx in re.finditer(
                r"ADD\s+(UNIQUE\s+KEY|UNIQUE\s+INDEX|KEY|INDEX)\s+`?([a-zA-Z0-9_]+)`?\s*(\([^)]+\))",
                ops_str,
                flags=re.IGNORECASE,
            ):
                itype = "UNIQUE KEY" if "UNIQUE" in add_idx.group(1).upper() else "KEY"
                iname = add_idx.group(2)
                irest = add_idx.group(3).strip()
                tschema.indexes[iname] = f"{itype} `{iname}` {irest}"

            # ADD CONSTRAINT ... FOREIGN KEY
            for add_fk in re.finditer(
                r"ADD\s+CONSTRAINT\s+`?([a-zA-Z0-9_]+)`?\s+FOREIGN\s+KEY\s+([^,]+)",
                ops_str,
                flags=re.IGNORECASE,
            ):
                fk_name = add_fk.group(1)
                fk_rest = add_fk.group(2).strip()
                tschema.foreign_keys[fk_name] = f"CONSTRAINT `{fk_name}` FOREIGN KEY {fk_rest}"

    return schemas


def load_live_database_schemas(db: DatabaseExecutor) -> Dict[str, TableSchema]:
    """Queries `SHOW CREATE TABLE` for every table in the live MySQL database."""
    schemas: Dict[str, TableSchema] = {}
    tables = [t for t in db.list_tables() if t not in IGNORED_TABLES]
    for tbl in sorted(tables):
        rows = db.query_rows(f"SHOW CREATE TABLE `{tbl}`;")
        if not rows or len(rows[0]) < 2:
            continue
        # mysql -B -N escapes newlines as literal \n in tab-separated output
        create_sql = rows[0][1].replace("\\n", "\n").strip()
        # Strip AUTO_INCREMENT=xxx from table options
        create_sql = re.sub(r"\s+AUTO_INCREMENT=\d+", "", create_sql, flags=re.IGNORECASE)
        if not create_sql.endswith(";"):
            create_sql += ";"
        schemas[tbl] = _parse_create_table_block(tbl, create_sql)
    return schemas


def compute_schema_diff(
    baseline: Dict[str, TableSchema],
    live: Dict[str, TableSchema],
    include_drops: bool = False,
) -> Tuple[List[str], List[str]]:
    """
    Compares baseline (`V*.sql`) vs live MySQL schema.
    Returns `(sql_statements, summary_items)`.
    """
    statements: List[str] = []
    summaries: List[str] = []

    # 1. Detect newly added tables
    for tbl_name, live_tbl in live.items():
        if tbl_name not in baseline:
            clean_create = re.sub(
                r"^CREATE\s+TABLE\s+",
                "CREATE TABLE IF NOT EXISTS ",
                live_tbl.raw_create_sql,
                count=1,
                flags=re.IGNORECASE,
            )
            statements.append(f"-- New table `{tbl_name}`\n{clean_create}")
            summaries.append(f"create_{tbl_name}")

    # 2. Detect table alterations (added/modified/dropped columns, indexes, FKs)
    for tbl_name, live_tbl in live.items():
        if tbl_name not in baseline:
            continue
        base_tbl = baseline[tbl_name]
        table_alters: List[str] = []

        # 2a. Added or modified columns
        for col_name, live_norm in live_tbl.columns.items():
            raw_col_ddl = live_tbl.raw_columns[col_name]
            if col_name not in base_tbl.columns:
                table_alters.append(f"ALTER TABLE `{tbl_name}` ADD COLUMN {raw_col_ddl};")
                summaries.append(f"add_{col_name}_to_{tbl_name}")
            elif base_tbl.columns[col_name] != live_norm:
                table_alters.append(f"ALTER TABLE `{tbl_name}` MODIFY COLUMN {raw_col_ddl};")
                summaries.append(f"modify_{col_name}_in_{tbl_name}")

        # 2b. Dropped columns (only when --include-drops is specified)
        if include_drops:
            for col_name in base_tbl.columns:
                if col_name not in live_tbl.columns:
                    table_alters.append(f"ALTER TABLE `{tbl_name}` DROP COLUMN `{col_name}`;")
                    summaries.append(f"drop_{col_name}_from_{tbl_name}")

        # 2c. Added indexes / unique keys
        for idx_name, idx_ddl in live_tbl.indexes.items():
            if idx_name not in base_tbl.indexes:
                table_alters.append(f"ALTER TABLE `{tbl_name}` ADD {idx_ddl};")

        # 2d. Added foreign keys
        for fk_name, fk_ddl in live_tbl.foreign_keys.items():
            if fk_name not in base_tbl.foreign_keys:
                table_alters.append(f"ALTER TABLE `{tbl_name}` ADD {fk_ddl};")

        if table_alters:
            statements.append(f"-- Alter table `{tbl_name}`\n" + "\n".join(table_alters))

    # 3. Dropped tables (only when --include-drops is specified)
    if include_drops:
        for tbl_name in baseline:
            if tbl_name not in live:
                statements.append(f"DROP TABLE IF EXISTS `{tbl_name}`;")
                summaries.append(f"drop_{tbl_name}")

    return statements, summaries


def _next_migration_version() -> int:
    mig_files = get_sorted_migration_files()
    max_ver = 0
    for f in mig_files:
        m = re.match(r"^V(\d+)__", f.name)
        if m:
            max_ver = max(max_ver, int(m.group(1)))
    return max_ver + 1


def _sanitize_slug(name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_]+", "_", name.strip().lower()).strip("_")
    return slug or "schema_update"


def generate_migration(
    message: Optional[str] = None,
    dry_run: bool = False,
    include_drops: bool = False,
) -> Optional[Path]:
    cfg = load_db_config()
    db = DatabaseExecutor(cfg)

    print("=" * 72)
    print(f" NexSpace Make Migration — Comparing `db/migration/V*.sql` vs `{cfg.database}`")
    print("=" * 72)

    baseline = load_migration_history_schemas()
    live = load_live_database_schemas(db)

    statements, summaries = compute_schema_diff(
        baseline=baseline,
        live=live,
        include_drops=include_drops,
    )

    if not statements:
        print(" [OK] Không phát hiện thay đổi cấu trúc bảng/cột nào giữa Database hiện tại và thư mục `db/migration/`.")
        return None

    next_ver = _next_migration_version()
    if message:
        slug = _sanitize_slug(message)
    else:
        auto_slug = "_and_".join(summaries[:2])
        if len(summaries) > 2:
            auto_slug += f"_and_{len(summaries) - 2}_more"
        slug = _sanitize_slug(auto_slug)

    file_name = f"V{next_ver}__{slug}.sql"
    target_path = MIGRATION_DIR / file_name
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    header = [
        "-- =============================================================================",
        f"-- NexSpace Flyway Migration V{next_ver}: {slug}",
        f"-- Generated at: {timestamp} by scripts/db/make_migration.py",
        "-- =============================================================================",
        "",
        "SET NAMES utf8mb4;",
        "",
    ]
    sql_content = "\n".join(header) + "\n\n".join(statements) + "\n"

    print(f"-> Phát hiện {len(statements)} nhóm thay đổi cấu trúc (Schema Diff):")
    print("-" * 72)
    print(sql_content.strip())
    print("-" * 72)

    if dry_run:
        print(f" [DRY-RUN] Chưa ghi file. Nếu chạy thật sẽ tạo: `{target_path}`")
        return None

    MIGRATION_DIR.mkdir(parents=True, exist_ok=True)
    target_path.write_text(sql_content, encoding="utf-8")
    print(f" [OK] Đã tạo file migration mới: `{target_path}`")
    return target_path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Tự động so sánh cấu trúc DB hiện tại với các file V*.sql và sinh file migration Flyway mới."
    )
    parser.add_argument(
        "-m",
        "--message",
        type=str,
        default=None,
        help="Tên mô tả cho file migration (ví dụ: 'add_checkin_note_to_booking'). Nếu bỏ trống sẽ tự động đặt tên.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Chỉ hiển thị câu lệnh SQL khác biệt ra màn hình mà không tạo file mới.",
    )
    parser.add_argument(
        "--include-drops",
        action="store_true",
        help="Bao gồm cả lệnh DROP COLUMN / DROP TABLE nếu cột/bảng bị xóa khỏi DB.",
    )
    args = parser.parse_args()
    generate_migration(
        message=args.message,
        dry_run=args.dry_run,
        include_drops=args.include_drops,
    )


if __name__ == "__main__":
    main()

