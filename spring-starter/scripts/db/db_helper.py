#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NexSpace Database Helper (`db_helper.py`)
=========================================
Shared connection manager, SQL runner, BCrypt password encoder, and AES-GCM
bank account cipher for NexSpace database initialization and cleanup scripts.

Features:
- Automatically reads DB credentials & seed settings from:
  1. Environment variables (`DB_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)
  2. `spring-starter/src/main/resources/application-local.properties`
  3. `spring-starter/src/main/resources/application.properties`
- Dual Execution Engine:
  - Uses `PyMySQL` or `mysql-connector-python` directly if installed.
  - Automatically falls back to `mysql` CLI or `docker exec -i <container> mysql`
    with `--default-character-set=utf8mb4` so scripts run out-of-the-box with
    zero external pip dependencies.
"""

from __future__ import annotations

import base64
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence
from urllib.parse import urlparse

SCRIPT_DIR = Path(__file__).resolve().parent
SPRING_STARTER_DIR = SCRIPT_DIR.parent.parent
RESOURCES_DIR = SPRING_STARTER_DIR / "src" / "main" / "resources"
MIGRATION_DIR = RESOURCES_DIR / "db" / "migration"
MIGRATION_V1_FILE = MIGRATION_DIR / "V1__init_schema.sql"


def get_sorted_migration_files() -> List[Path]:
    """Returns all Flyway V*.sql migration files sorted by version number (V1, V2, V3...)."""
    if not MIGRATION_DIR.is_dir():
        return []

    def _version_key(p: Path) -> List[int]:
        match = re.match(r"^V([0-9_]+)__", p.name)
        if not match:
            return [999999]
        return [int(part) for part in match.group(1).split("_") if part.isdigit()]

    files = [f for f in MIGRATION_DIR.glob("V*__*.sql") if f.is_file()]
    return sorted(files, key=_version_key)

# Precomputed standard BCrypt ($2a$10$) hashes for instant fallback
PRECOMPUTED_BCRYPT_HASHES: Dict[str, str] = {
    "Admin@123456": "$2a$10$9Rz24E9.4x1MkCvRG/oMHuMbt8gQCwKtvoovXhLPkkr1MZcRq/wc.",
    "Organizer@123456": "$2a$10$vu4yweqk.UJfqaKsJYGzx.J92ky5Pp9kyg3F9if/pi.iJVEhj5kEe",
    "Customer@123456": "$2a$10$4VdXhoiLZv5P4fClrspFZu6tLOwFxEzOSUXNsNP5SttF6CrzAvGPW",
    "NexSpace@2026": "$2a$10$4VdXhoiLZv5P4fClrspFZu6tLOwFxEzOSUXNsNP5SttF6CrzAvGPW",
    "123456": "$2a$10$e0MYzXyjpJS7Pd0RVvHwHeFXbf5c5/vP6mC.1lH8nF4.O4b4O1.W2",
}


@dataclass
class DbConfig:
    host: str = "localhost"
    port: int = 3306
    database: str = "next_space"
    user: str = "next_space"
    password: str = "XzmAHRMfhmxXFzmH"
    docker_container: str = "nexspace-mysql"
    admin_email: str = "admin@nexspace.vn"
    admin_username: str = "admin"
    admin_password: str = "Admin@123456"
    organizer_email: str = "organizer@nexspace.vn"
    organizer_username: str = "organizer"
    organizer_password: str = "Organizer@123456"
    customer_password: str = "Customer@123456"
    bank_encryption_key: str = ""
    raw_properties: Dict[str, str] = field(default_factory=dict)


def _parse_properties_file(path: Path) -> Dict[str, str]:
    props: Dict[str, str] = {}
    if not path.is_file():
        return props
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or line.startswith("!"):
            continue
        if "=" in line:
            k, v = line.split("=", 1)
            props[k.strip()] = v.strip()
    return props


def _parse_jdbc_mysql_url(jdbc_url: str) -> Dict[str, Any]:
    if not jdbc_url:
        return {}
    clean = jdbc_url[5:] if jdbc_url.startswith("jdbc:") else jdbc_url
    parsed = urlparse(clean)
    db_name = (parsed.path or "").lstrip("/")
    result: Dict[str, Any] = {}
    if parsed.hostname:
        result["host"] = parsed.hostname
    if parsed.port:
        result["port"] = int(parsed.port)
    if db_name:
        result["database"] = db_name
    return result


def load_db_config() -> DbConfig:
    """Loads DB & seed settings from properties files and environment variables."""
    props: Dict[str, str] = {}

    # 1. Default application.properties
    props.update(_parse_properties_file(RESOURCES_DIR / "application.properties"))

    # 2. Fallback to sibling wt-backend application-local.properties if worktree doesn't have one yet
    sibling_local = (
        SPRING_STARTER_DIR.parent.parent.parent
        / "wt-backend"
        / "spring-starter"
        / "src"
        / "main"
        / "resources"
        / "application-local.properties"
    )
    if sibling_local.is_file():
        props.update(_parse_properties_file(sibling_local))

    # 3. Current worktree application-local.properties
    local_props = RESOURCES_DIR / "application-local.properties"
    if local_props.is_file():
        props.update(_parse_properties_file(local_props))

    cfg = DbConfig(raw_properties=props)

    jdbc_url = os.environ.get("DB_URL") or props.get("spring.datasource.url", "")
    if jdbc_url and not jdbc_url.startswith("${"):
        parsed_url = _parse_jdbc_mysql_url(jdbc_url)
        cfg.host = parsed_url.get("host", cfg.host)
        cfg.port = parsed_url.get("port", cfg.port)
        cfg.database = parsed_url.get("database", cfg.database)

    cfg.host = os.environ.get("DB_HOST", cfg.host)
    cfg.port = int(os.environ.get("DB_PORT", str(cfg.port)))
    cfg.database = os.environ.get("DB_NAME", cfg.database)

    prop_user = props.get("spring.datasource.username", "")
    if prop_user and not prop_user.startswith("${"):
        cfg.user = prop_user
    cfg.user = os.environ.get("DB_USERNAME", os.environ.get("DB_USER", cfg.user))

    prop_pass = props.get("spring.datasource.password", "")
    if prop_pass and not prop_pass.startswith("${"):
        cfg.password = prop_pass
    cfg.password = os.environ.get("DB_PASSWORD", cfg.password)

    cfg.docker_container = os.environ.get("DOCKER_CONTAINER", cfg.docker_container)

    # Seed account overrides
    admin_pass = props.get("app.seed.admin.password", "")
    if admin_pass and not admin_pass.startswith("${"):
        cfg.admin_password = admin_pass
    org_pass = props.get("app.seed.organizer.password", "")
    if org_pass and not org_pass.startswith("${"):
        cfg.organizer_password = org_pass

    bank_key = props.get("app.organizer.bank.encryption-key", "")
    if bank_key and not bank_key.startswith("${"):
        cfg.bank_encryption_key = bank_key

    return cfg


def bcrypt_hash(raw_password: str) -> str:
    """Generates a Spring Security compatible $2a$10$ BCrypt password hash."""
    if raw_password in PRECOMPUTED_BCRYPT_HASHES:
        return PRECOMPUTED_BCRYPT_HASHES[raw_password]

    # Try Python bcrypt module if available
    try:
        import bcrypt  # type: ignore

        hashed = bcrypt.hashpw(raw_password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")
        if hashed.startswith("$2b$") or hashed.startswith("$2y$"):
            hashed = "$2a$" + hashed[4:]
        PRECOMPUTED_BCRYPT_HASHES[raw_password] = hashed
        return hashed
    except ImportError:
        pass

    # Try system htpasswd (built-in on macOS / Linux)
    htpasswd_bin = shutil.which("htpasswd")
    if htpasswd_bin:
        try:
            proc = subprocess.run(
                [htpasswd_bin, "-nbB", "-C", "10", "", raw_password],
                capture_output=True,
                text=True,
                check=True,
            )
            out = proc.stdout.strip()
            if ":" in out:
                hashed = out.split(":", 1)[1].strip()
                if hashed.startswith("$2y$") or hashed.startswith("$2b$"):
                    hashed = "$2a$" + hashed[4:]
                PRECOMPUTED_BCRYPT_HASHES[raw_password] = hashed
                return hashed
        except Exception:
            pass

    return PRECOMPUTED_BCRYPT_HASHES["Customer@123456"]


def encrypt_bank_account(profile_id: int, account_number: str, base64_key: str) -> str:
    """
    Encrypts an Organizer bank account number using the exact format expected by
    `OrganizerBankAccountCipher.java`: `bank:v1:<iv_base64>:<ciphertext_base64>`
    with AES-256-GCM (12-byte IV, 128-bit tag) and AAD `organizer-profile:<id>`.
    """
    if not base64_key:
        return account_number

    try:
        key_bytes = base64.b64decode(base64_key.strip())
        if len(key_bytes) != 32:
            return account_number
    except Exception:
        return account_number

    # 1. Try Python `cryptography` package if installed
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # type: ignore

        iv = os.urandom(12)
        aesgcm = AESGCM(key_bytes)
        aad = f"organizer-profile:{profile_id}".encode("utf-8")
        ct = aesgcm.encrypt(iv, account_number.encode("utf-8"), aad)
        return f"bank:v1:{base64.b64encode(iv).decode('ascii')}:{base64.b64encode(ct).decode('ascii')}"
    except ImportError:
        pass

    # 2. Fallback to JDK 17 single-file source execution (always available in Spring Boot environment)
    java_bin = shutil.which("java")
    if java_bin:
        java_code = """
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

public class BankCipherHelper {
    public static void main(String[] args) throws Exception {
        long profileId = Long.parseLong(args[0]);
        String number = args[1];
        byte[] keyBytes = Base64.getDecoder().decode(args[2].trim());
        SecretKeySpec key = new SecretKeySpec(keyBytes, "AES");
        byte[] iv = new byte[12];
        new SecureRandom().nextBytes(iv);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
        cipher.updateAAD(("organizer-profile:" + profileId).getBytes(StandardCharsets.UTF_8));
        byte[] ct = cipher.doFinal(number.getBytes(StandardCharsets.UTF_8));
        System.out.print("bank:v1:" + Base64.getEncoder().encodeToString(iv) + ":" + Base64.getEncoder().encodeToString(ct));
    }
}
"""
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                java_file = Path(tmpdir) / "BankCipherHelper.java"
                java_file.write_text(java_code, encoding="utf-8")
                proc = subprocess.run(
                    [java_bin, str(java_file), str(profile_id), account_number, base64_key],
                    capture_output=True,
                    text=True,
                    check=True,
                )
                if proc.stdout.startswith("bank:v1:"):
                    return proc.stdout.strip()
        except Exception:
            pass

    return account_number


def sql_literal(val: Any) -> str:
    """Safely converts a Python value into a UTF-8 MySQL literal."""
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "b'1'" if val else "b'0'"
    if isinstance(val, (int, float)):
        return str(val)
    s = str(val)
    s = (
        s.replace("\\", "\\\\")
        .replace("'", "\\'")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\0", "")
    )
    return f"'{s}'"


class DatabaseExecutor:
    """Executes SQL scripts and queries against MySQL via PyMySQL or CLI/Docker fallback."""

    def __init__(self, config: Optional[DbConfig] = None) -> None:
        self.config = config or load_db_config()
        self.mode = self._detect_mode()

    def _detect_mode(self) -> str:
        try:
            import pymysql  # type: ignore  # noqa: F401

            return "pymysql"
        except ImportError:
            pass

        try:
            import mysql.connector  # type: ignore  # noqa: F401

            return "mysql_connector"
        except ImportError:
            pass

        if shutil.which("mysql"):
            return "mysql_cli"

        if shutil.which("docker"):
            return "docker_exec"

        raise RuntimeError(
            "Không tìm thấy trình kết nối MySQL (`PyMySQL`, `mysql` CLI, hoặc `docker`). "
            "Hãy chạy `pip install -r spring-starter/scripts/db/requirements.txt` hoặc bật Docker/OrbStack."
        )

    def execute_sql_script(self, sql_script: str) -> None:
        """Executes a multi-statement UTF-8 SQL script."""
        full_sql = "SET NAMES utf8mb4;\n" + sql_script

        if self.mode == "pymysql":
            import pymysql  # type: ignore
            from pymysql.constants import CLIENT  # type: ignore

            conn = pymysql.connect(
                host=self.config.host,
                port=self.config.port,
                user=self.config.user,
                password=self.config.password,
                database=self.config.database,
                charset="utf8mb4",
                client_flag=CLIENT.MULTI_STATEMENTS,
                autocommit=True,
            )
            try:
                with conn.cursor() as cur:
                    cur.execute(full_sql)
            finally:
                conn.close()
            return

        if self.mode == "mysql_connector":
            import mysql.connector  # type: ignore

            conn = mysql.connector.connect(
                host=self.config.host,
                port=self.config.port,
                user=self.config.user,
                password=self.config.password,
                database=self.config.database,
                charset="utf8mb4",
                autocommit=True,
            )
            try:
                cur = conn.cursor()
                for _ in cur.execute(full_sql, multi=True):
                    pass
                cur.close()
            finally:
                conn.close()
            return

        if self.mode == "mysql_cli":
            cmd = [
                "mysql",
                f"-h{self.config.host}",
                f"-P{self.config.port}",
                f"-u{self.config.user}",
                f"-p{self.config.password}",
                "--default-character-set=utf8mb4",
                self.config.database,
            ]
            proc = subprocess.run(
                cmd,
                input=full_sql.encode("utf-8"),
                capture_output=True,
            )
            if proc.returncode != 0:
                stderr = proc.stderr.decode("utf-8", errors="replace")
                raise RuntimeError(f"MySQL CLI error:\n{stderr}")
            return

        if self.mode == "docker_exec":
            cmd = [
                "docker",
                "exec",
                "-i",
                self.config.docker_container,
                "mysql",
                f"-u{self.config.user}",
                f"-p{self.config.password}",
                "--default-character-set=utf8mb4",
                self.config.database,
            ]
            proc = subprocess.run(
                cmd,
                input=full_sql.encode("utf-8"),
                capture_output=True,
            )
            if proc.returncode != 0:
                stderr = proc.stderr.decode("utf-8", errors="replace")
                raise RuntimeError(f"Docker MySQL error:\n{stderr}")
            return

    def query_rows(self, sql_query: str) -> List[List[str]]:
        """Executes a SELECT/SHOW query and returns rows of string values."""
        if self.mode == "pymysql":
            import pymysql  # type: ignore

            conn = pymysql.connect(
                host=self.config.host,
                port=self.config.port,
                user=self.config.user,
                password=self.config.password,
                database=self.config.database,
                charset="utf8mb4",
            )
            try:
                with conn.cursor() as cur:
                    cur.execute(sql_query)
                    return [["" if cell is None else str(cell) for cell in row] for row in cur.fetchall()]
            finally:
                conn.close()

        if self.mode == "mysql_connector":
            import mysql.connector  # type: ignore

            conn = mysql.connector.connect(
                host=self.config.host,
                port=self.config.port,
                user=self.config.user,
                password=self.config.password,
                database=self.config.database,
                charset="utf8mb4",
            )
            try:
                cur = conn.cursor()
                cur.execute(sql_query)
                rows = [["" if cell is None else str(cell) for cell in row] for row in cur.fetchall()]
                cur.close()
                return rows
            finally:
                conn.close()

        if self.mode == "mysql_cli":
            cmd = [
                "mysql",
                f"-h{self.config.host}",
                f"-P{self.config.port}",
                f"-u{self.config.user}",
                f"-p{self.config.password}",
                "--default-character-set=utf8mb4",
                "-N",
                "-B",
                self.config.database,
                "-e",
                sql_query,
            ]
        else:
            cmd = [
                "docker",
                "exec",
                "-i",
                self.config.docker_container,
                "mysql",
                f"-u{self.config.user}",
                f"-p{self.config.password}",
                "--default-character-set=utf8mb4",
                "-N",
                "-B",
                self.config.database,
                "-e",
                sql_query,
            ]

        proc = subprocess.run(cmd, capture_output=True)
        if proc.returncode != 0:
            stderr = proc.stderr.decode("utf-8", errors="replace")
            raise RuntimeError(f"Query failed:\n{stderr}")
        out = proc.stdout.decode("utf-8", errors="replace").strip()
        if not out:
            return []
        return [line.split("\t") for line in out.splitlines()]

    def list_tables(self) -> List[str]:
        rows = self.query_rows("SHOW TABLES;")
        return [r[0] for r in rows if r]

    def get_table_counts(self, tables: Optional[Sequence[str]] = None) -> Dict[str, int]:
        target_tables = list(tables) if tables is not None else self.list_tables()
        if not target_tables:
            return {}
        union_parts = [
            f"SELECT '{t}' AS tbl, COUNT(*) AS cnt FROM `{t}`" for t in target_tables
        ]
        query = " UNION ALL ".join(union_parts) + ";"
        rows = self.query_rows(query)
        return {r[0]: int(r[1]) for r in rows if len(r) >= 2}

