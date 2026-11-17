#!/usr/bin/env bash
# ==========================================================
#  NexSpace — 1-Click Launch Backend (Spring Boot 3.5)
# ==========================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_PROPS="$SCRIPT_DIR/spring-starter/src/main/resources/application-local.properties"

if [ ! -f "$LOCAL_PROPS" ]; then
    echo "=========================================================="
    echo " Chưa tìm thấy file application-local.properties!"
    echo " Đang khởi chạy công cụ đồng bộ cấu hình..."
    echo "=========================================================="
    bash "$SCRIPT_DIR/sync-config.sh"
fi

echo "=========================================================="
echo " Khởi động NexSpace Backend (Spring Boot 3.5)..."
echo "=========================================================="
cd "$SCRIPT_DIR/spring-starter"
./mvnw spring-boot:run
