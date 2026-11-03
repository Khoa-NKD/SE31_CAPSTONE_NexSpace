<#
.SYNOPSIS
    Script đồng bộ tự động file application-local.properties từ GitHub Secret Gist.
.DESCRIPTION
    Tải file cấu hình bí mật cho team NexSpace mà không cần đưa mật khẩu lên Git public repo.
#>

$TargetDir = Join-Path $PSScriptRoot "spring-starter/src/main/resources"
$TargetFile = Join-Path $TargetDir "application-local.properties"
$UrlFile = Join-Path $PSScriptRoot ".gist-url"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " NexSpace - Dong bo cau hinh application-local.properties" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Kiem tra thu muc target
if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

# 2. Lay duong link Gist
$GistUrl = ""
if (Test-Path $UrlFile) {
    $GistUrl = (Get-Content $UrlFile -Raw).Trim()
}

if ([string]::IsNullOrWhiteSpace($GistUrl)) {
    Write-Host "`nChua co cau hinh link Gist cua nhom!" -ForegroundColor Yellow
    Write-Host "Nhap link Secret Gist hoac Raw URL cua nhom (chi can nhap 1 lan duy nhat):"
    $InputUrl = Read-Host "Link Gist"
    $GistUrl = $InputUrl.Trim()
    
    if ([string]::IsNullOrWhiteSpace($GistUrl)) {
        Write-Host "[-] Loi: Link Gist khong duoc de trong." -ForegroundColor Red
        exit 1
    }
}

# Tu dong chuan hoa neu nguoi dung nhap link gist.github.com thay vi raw
if ($GistUrl -match "gist\.github\.com/([^/]+)/([a-f0-9]+)") {
    $User = $Matches[1]
    $GistId = $Matches[2]
    $GistUrl = "https://gist.githubusercontent.com/$User/$GistId/raw/application-local.properties"
    Write-Host "[*] Da tu dong chuyen doi sang Raw Gist URL: $GistUrl" -ForegroundColor Gray
}

# 3. Tai noi dung moi nhat tu Gist (kem timestamp tranh cache)
Write-Host "`n[*] Dang tai cau hinh moi nhat tu Gist..." -ForegroundColor Cyan
try {
    $Timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $FetchUrl = if ($GistUrl.Contains("?")) { "$GistUrl&t=$Timestamp" } else { "$GistUrl`?t=$Timestamp" }
    
    $Content = (Invoke-RestMethod -Uri $FetchUrl -Method Get -Headers @{ "Cache-Control" = "no-cache"; "Pragma" = "no-cache" } -ErrorAction Stop)

    if ([string]::IsNullOrWhiteSpace($Content)) {
        throw "Noi dung tai ve rong."
    }

    # Luu file application-local.properties
    [System.IO.File]::WriteAllText($TargetFile, $Content, [System.Text.Encoding]::UTF8)

    # Luu cache URL cho cac lan sau
    [System.IO.File]::WriteAllText($UrlFile, $GistUrl, [System.Text.Encoding]::UTF8)

    Write-Host "`n[+] THANH CONG: Da cap nhat file cau hinh tai:" -ForegroundColor Green
    Write-Host "    $TargetFile" -ForegroundColor Yellow
    Write-Host "[+] Gio day ban co the khoi chay Backend binh thuong!" -ForegroundColor Green
}
catch {
    Write-Host "`n[-] LOI khi tai file: $_" -ForegroundColor Red
    Write-Host "[-] Kiem tra lai duong link Gist va ket noi mang." -ForegroundColor Red
    
    # Xoa file cache URL de lan sau nguoi dung co the nhap lai link dung
    if (Test-Path $UrlFile) {
        Remove-Item $UrlFile -Force
    }
    exit 1
}

