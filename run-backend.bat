@echo off
chcp 65001 >nul
setlocal

set SCRIPT_DIR=%~dp0
set LOCAL_PROPS=%SCRIPT_DIR%spring-starter\src\main\resources\application-local.properties

if not exist "%LOCAL_PROPS%" (
    echo ==========================================================
    echo  Chua tim thay file application-local.properties!
    echo  Dang chay dong bo cau hinh...
    echo ==========================================================
    call "%SCRIPT_DIR%sync-config.bat"
)

echo ==========================================================
echo  Khoi dong NexSpace Backend (Spring Boot 3.5)...
echo ==========================================================
cd /d "%SCRIPT_DIR%spring-starter"
call mvnw.cmd spring-boot:run
