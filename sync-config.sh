#!/usr/bin/env bash
# ==========================================================
#  NexSpace — Đồng bộ cấu hình application-local.properties
# ==========================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$SCRIPT_DIR/spring-starter/src/main/resources"
TARGET_FILE="$TARGET_DIR/application-local.properties"
EXAMPLE_FILE="$TARGET_DIR/application-local.properties.example"
URL_FILE="$SCRIPT_DIR/.gist-url"

echo "=========================================================="
echo " NexSpace - Đồng bộ cấu hình application-local.properties"
echo "=========================================================="

mkdir -p "$TARGET_DIR"

GIST_URL=""
if [ -f "$URL_FILE" ]; then
    GIST_URL=$(head -n 1 "$URL_FILE" | tr -d '\r\n[:space:]')
fi

if [ -z "$GIST_URL" ]; then
    echo ""
    echo "Chưa có cấu hình link Gist của nhóm!"
    echo "1. Dán link Secret Gist hoặc Raw URL (chỉ cần nhập 1 lần duy nhất)."
    echo "2. Hoặc nhấn Enter để tự động tạo từ application-local.properties.example (offline mode)."
    read -rp "Link Gist [Enter để dùng file .example]: " INPUT_URL
    INPUT_URL=$(echo "$INPUT_URL" | tr -d '\r\n[:space:]')
    
    if [ -z "$INPUT_URL" ]; then
        if [ -f "$EXAMPLE_FILE" ]; then
            cp "$EXAMPLE_FILE" "$TARGET_FILE"
            echo ""
            echo "[+] Đã tạo file cấu hình mẫu từ .example tại:"
            echo "    $TARGET_FILE"
            echo "[*] Vui lòng mở file trên và điền thông tin kết nối MySQL/Secrets của bạn."
            exit 0
        else
            echo "[-] Không tìm thấy file $EXAMPLE_FILE"
            exit 1
        fi
    fi
    GIST_URL="$INPUT_URL"
fi

# Chuyển đổi link gist.github.com sang raw format nếu người dùng dán link gist UI
if [[ "$GIST_URL" =~ gist\.github\.com/([^/]+)/([a-f0-9]+) ]]; then
    USER="${BASH_REMATCH[1]}"
    GIST_ID="${BASH_REMATCH[2]}"
    GIST_URL="https://gist.githubusercontent.com/$USER/$GIST_ID/raw/application-local.properties"
    echo "[*] Đã tự động chuyển đổi sang Raw Gist URL: $GIST_URL"
fi

echo ""
echo "[*] Đang tải cấu hình mới nhất từ Gist..."
TIMESTAMP=$(date +%s)
if [[ "$GIST_URL" == *"?"* ]]; then
    FETCH_URL="${GIST_URL}&t=${TIMESTAMP}"
else
    FETCH_URL="${GIST_URL}?t=${TIMESTAMP}"
fi

TMP_FILE=$(mktemp)
if curl -sSL -H "Cache-Control: no-cache" -H "Pragma: no-cache" "$FETCH_URL" -o "$TMP_FILE"; then
    if [ ! -s "$TMP_FILE" ]; then
        echo "[-] Lỗi: Nội dung tải về rỗng."
        rm -f "$TMP_FILE"
        exit 1
    fi
    mv "$TMP_FILE" "$TARGET_FILE"
    echo "$GIST_URL" > "$URL_FILE"
    echo ""
    echo "[+] THÀNH CÔNG: Đã cập nhật file cấu hình tại:"
    echo "    $TARGET_FILE"
    echo "[+] Giờ đây bạn có thể khởi chạy Backend bằng ./run-backend.sh hoặc ./mvnw spring-boot:run"
else
    echo ""
    echo "[-] LỖI khi tải file từ $FETCH_URL"
    echo "[-] Vui lòng kiểm tra lại đường link Gist và kết nối mạng."
    rm -f "$TMP_FILE" "$URL_FILE"
    exit 1
fi
