#!/usr/bin/env python3
"""Verify Flyway V1 on an isolated MySQL 8.4 Docker container, then remove it."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
IMAGE = "mysql:8.4"


def run(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)


def main():
    run("docker", "info", stdout=subprocess.DEVNULL)
    image = subprocess.run(["docker", "image", "inspect", IMAGE], capture_output=True)
    if image.returncode:
        print(f"Image {IMAGE} is missing; pulling it.", flush=True)
        run("docker", "pull", IMAGE)
    else:
        print(f"Using existing image {IMAGE}; no pull needed.", flush=True)

    suffix = uuid.uuid4().hex[:12]
    name = f"nexspace-migration-check-{suffix}"
    database = f"nexspace_migration_{suffix}"
    password = secrets.token_urlsafe(32)
    created = False
    try:
        # Credentials stay in a temporary file/environment, never in the command line.
        with tempfile.TemporaryDirectory(prefix="nexspace-mysql-check-") as folder:
            env_file = Path(folder) / "mysql.env"
            env_file.write_text(f"MYSQL_ROOT_PASSWORD={password}\nMYSQL_DATABASE={database}\nMYSQL_USER=migration_check\nMYSQL_PASSWORD={password}\nTZ=UTC\n")
            env_file.chmod(0o600)
            run("docker", "run", "--detach", "--name", name,
                "--label", "nexspace.purpose=migration-verification",
                "--env-file", str(env_file),
                "--publish", "127.0.0.1::3306",
                "--tmpfs", "/var/lib/mysql:rw",
                IMAGE, "--character-set-server=utf8mb4",
                "--collation-server=utf8mb4_0900_ai_ci", "--default-time-zone=+00:00",
                "--log-bin-trust-function-creators=ON",
                stdout=subprocess.DEVNULL)
            created = True

        deadline = time.monotonic() + 180
        while True:
            check = subprocess.run([
                "docker", "exec", name, "sh", "-c",
                'MYSQL_PWD="$MYSQL_PASSWORD" mysql --protocol=TCP -h 127.0.0.1 -u"$MYSQL_USER" -D "$MYSQL_DATABASE" -e "SELECT 1"'
            ], capture_output=True)
            if check.returncode == 0:
                break
            if time.monotonic() >= deadline:
                run("docker", "logs", "--tail", "60", name)
                raise RuntimeError("MySQL did not become ready within 180 seconds")
            time.sleep(2)

        metadata = json.loads(run("docker", "inspect", name, capture_output=True).stdout)[0]
        port = metadata["NetworkSettings"]["Ports"]["3306/tcp"][0]["HostPort"]
        version = run("docker", "exec", name, "mysql", "--version", capture_output=True).stdout.strip()
        print(f"Ready: {version}; isolated database {database} on 127.0.0.1:{port}", flush=True)
        env = os.environ.copy()
        url = f"jdbc:mysql://127.0.0.1:{port}/{database}?allowPublicKeyRetrieval=true&useSSL=false&connectionTimeZone=UTC"
        env.update(NEXSPACE_MYSQL_TEST_URL=url, NEXSPACE_MYSQL_TEST_USER="migration_check",
                   NEXSPACE_MYSQL_TEST_PASSWORD=password,
                   DB_URL=url, DB_USERNAME="migration_check", DB_PASSWORD=password)
        wrapper = "mvnw.cmd" if os.name == "nt" else "mvnw"
        run(str(ROOT / wrapper), "-B", "-ntp", "-Dtest=MySqlMigrationIntegrationTest", "test", cwd=ROOT, env=env)
        # Verify the developer-facing Maven commands against the same migrated schema.
        run(str(ROOT / wrapper), "-B", "-ntp", "flyway:validate", "flyway:migrate", "flyway:info", cwd=ROOT, env=env)
        run(str(ROOT / wrapper), "-B", "-ntp", "-DskipTests", "package", cwd=ROOT, env=env)
        run("python3", str(ROOT / "scripts/verify-backend.py"), cwd=ROOT, env=env)
        print("PASS: Flyway V1, constraints, triggers, checksum validation, Maven migration commands and packaged backend HTTP tests.", flush=True)
    finally:
        if created:
            run("docker", "rm", "--force", name, stdout=subprocess.DEVNULL)
            print(f"Removed temporary container {name}; existing containers and volumes were not changed.", flush=True)


if __name__ == "__main__":
    main()
