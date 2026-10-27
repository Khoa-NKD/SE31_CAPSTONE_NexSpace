#!/usr/bin/env python3
"""HTTP smoke tests against the packaged backend on an isolated migration-test DB."""
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import uuid

ROOT = Path(__file__).resolve().parents[1]


def verify():
    if "/nexspace_migration_" not in os.environ.get("DB_URL", ""):
        raise RuntimeError("Run via verify-migration.py against its isolated database")
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    base = f"http://127.0.0.1:{port}"
    password = secrets.token_urlsafe(24)
    env = os.environ.copy()
    env.update(SPRING_PROFILES_ACTIVE="prod", SERVER_PORT=str(port),
               JWT_SECRET=secrets.token_urlsafe(48), CLIENT_URL="http://localhost:3000",
               API_URL=base, CORS_ALLOWED_ORIGINS="http://localhost:3000",
               EMAIL_VERIFICATION_ENABLED="false", SWAGGER_ENABLED="false",
               SEED_ADMIN_ENABLED="true", SEED_ADMIN_EMAIL="smoke-admin@example.com",
               SEED_ADMIN_PASSWORD=password, MAIL_USERNAME="", MAIL_PASSWORD="")

    def request(method, path, data=None, token=None, expected=200, headers=None):
        outgoing = {"Accept": "application/json", **(headers or {})}
        if data is not None:
            outgoing["Content-Type"] = "application/json"
        if token:
            outgoing["Authorization"] = f"Bearer {token}"
        req = Request(base + path, data=None if data is None else json.dumps(data).encode(), headers=outgoing, method=method)
        try:
            response = urlopen(req, timeout=5)
        except HTTPError as error:
            response = error
        with response:
            payload = json.loads(response.read())
            assert response.status == expected, (path, response.status, payload)
            request_id = response.headers.get("X-Request-ID")
            assert request_id, path
            if path.startswith("/api/") or expected >= 400:
                assert payload["requestId"] == request_id
                assert payload["timestamp"]
            if expected >= 400:
                assert payload["success"] is False and payload["status"] == expected
                assert payload["error"] and payload["path"] == path.split("?")[0]
            return payload

    with tempfile.TemporaryFile(mode="w+") as log:
        process = subprocess.Popen(["java", "-jar", str(ROOT / "target/spring-starter-0.0.1-SNAPSHOT.jar"), "--server.address=127.0.0.1"], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
        try:
            deadline = time.monotonic() + 90
            while True:
                if process.poll() is not None:
                    raise RuntimeError("Packaged backend exited during startup")
                try:
                    health = request("GET", "/actuator/health/readiness")
                    if health["status"] == "UP":
                        break
                except (URLError, AssertionError, TimeoutError):
                    pass
                if time.monotonic() >= deadline:
                    raise RuntimeError("Backend readiness timeout")
                time.sleep(1)
            assert "components" not in health
            # Production health must work with Swagger disabled.
            request("GET", "/v3/api-docs", expected=404)
            request("GET", "/actuator/env", expected=401)
            invalid = request("POST", "/api/v1/auth/register", {}, expected=400)
            assert "email" in invalid["validationErrors"]
            user_email = f"smoke-{uuid.uuid4().hex}@example.com"
            registered = request("POST", "/api/v1/auth/register", {"email": user_email, "password": password, "fullName": "Smoke Customer", "role": "Administrator"}, expected=201)
            customer_id = str(uuid.UUID(registered["data"]["id"]))
            assert registered["data"]["role"] == "Customer"
            login = request("POST", "/api/v1/auth/login", {"email": user_email, "password": password})["data"]
            access = login["accessToken"]
            assert request("GET", "/api/v1/auth/me", token=access)["data"]["id"] == customer_id
            request("GET", "/api/v1/admin/users", token=access, expected=403)
            admin = request("POST", "/api/v1/auth/login", {"email": "smoke-admin@example.com", "password": password})["data"]
            page = request("GET", "/api/v1/admin/users?page=0&size=10&sort=createdAt,desc", token=admin["accessToken"])["data"]
            assert page["page"] == 0 and page["size"] == 10 and len(page["content"]) >= 2
            assert page["totalElements"] >= 2
            request("PATCH", f"/api/v1/admin/users/{customer_id}/status", {"status": "Locked"}, token=admin["accessToken"])
            request("GET", "/api/v1/auth/me", token=access, expected=401)
            request("PATCH", f"/api/v1/admin/users/{customer_id}/status", {"status": "Active"}, token=admin["accessToken"])
            login = request("POST", "/api/v1/auth/login", {"username": user_email, "password": password})["data"]
            refreshed = request("POST", "/api/v1/auth/refresh", {"refreshToken": login["refreshToken"]})["data"]
            request("POST", "/api/v1/auth/refresh", {"refreshToken": login["refreshToken"]}, expected=401)
            next_password = secrets.token_urlsafe(24)
            request("POST", "/api/v1/auth/change-password", {"oldPassword": password, "newPassword": next_password, "confirmNewPassword": next_password}, token=refreshed["accessToken"])
            request("GET", "/api/v1/auth/me", token=refreshed["accessToken"], expected=401)
            request("POST", "/api/v1/auth/login", {"email": user_email, "password": password}, expected=401)
            final_login = request("POST", "/api/v1/auth/login", {"email": user_email, "password": next_password})["data"]
            request("POST", "/api/v1/auth/logout", token=final_login["accessToken"])
            request("GET", "/api/v1/auth/me", token=final_login["accessToken"], expected=401)
            request("POST", "/api/v1/auth/refresh", {"refreshToken": final_login["refreshToken"]}, expected=401)
            print("PASS: packaged backend + Flyway + Hibernate validate on MySQL; health, UUID auth, role restrictions, pagination, refresh rotation, account locking, password change and logout.", flush=True)
        except BaseException:
            log.seek(0)
            print(log.read()[-16000:], flush=True)
            raise
        finally:
            process.terminate()
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == "__main__":
    verify()
