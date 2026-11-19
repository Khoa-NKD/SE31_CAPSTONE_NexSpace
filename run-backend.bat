@echo off
chcp 65001 >nul
setlocal

set SCRIPT_DIR=%~dp0
set LOCAL_PROPS=%SCRIPT_DIR%spring-starter\src\main\resources\application-local.properties
set EXAMPLE_PROPS=%SCRIPT_DIR%spring-starter\src\main\resources\application-local.properties.example

:: Kiem tra va sua lai JAVA_HOME neu bi tro sai hoac chua co
if not exist "%JAVA_HOME%\bin\java.exe" (
    if exist "C:\Program Files\Java\jdk-21\bin\java.exe" (
        set "JAVA_HOME=C:\Program Files\Java\jdk-21"
        echo [INFO] Tu dong sua JAVA_HOME hop le: C:\Program Files\Java\jdk-21
    ) else if exist "C:\Program Files\Java\jdk-17\bin\java.exe" (
        set "JAVA_HOME=C:\Program Files\Java\jdk-17"
        echo [INFO] Tu dong sua JAVA_HOME hop le: C:\Program Files\Java\jdk-17
    )
)

if not exist "%LOCAL_PROPS%" (
    if exist "%EXAMPLE_PROPS%" (
        echo [INFO] Tu dong tao application-local.properties tu file mau
        copy "%EXAMPLE_PROPS%" "%LOCAL_PROPS%" >nul
    ) else (
        echo ==========================================================
        echo  Chua tim thay file application-local.properties!
        echo  Dang chay dong bo cau hinh
        echo ==========================================================
        call "%SCRIPT_DIR%sync-config.bat"
    )
)

:: Tu dong don dep file migration cu trong target de tranh trung lap version khi chuyen branch
if exist "%SCRIPT_DIR%spring-starter\target\classes\db\migration" (
    rd /s /q "%SCRIPT_DIR%spring-starter\target\classes\db\migration" >nul 2>&1
)

:: Tu dong giai phong cong 8080 neu co tien trinh java/server cu dang chiem
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do (
    echo [INFO] Tu dong giai phong cong 8080 PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo ==========================================================
echo  Khoi dong NexSpace Backend (Spring Boot 3.5)
echo ==========================================================
cd /d "%SCRIPT_DIR%spring-starter"
call mvnw.cmd spring-boot:run
