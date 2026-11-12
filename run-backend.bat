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
        echo [INFO] Tu dong tao application-local.properties tu file mau...
        copy "%EXAMPLE_PROPS%" "%LOCAL_PROPS%" >nul
    ) else (
        echo ==========================================================
        echo  Chua tim thay file application-local.properties!
        echo  Dang chay dong bo cau hinh...
        echo ==========================================================
        call "%SCRIPT_DIR%sync-config.bat"
    )
)

echo ==========================================================
echo  Khoi dong NexSpace Backend (Spring Boot 3.5)...
echo ==========================================================
cd /d "%SCRIPT_DIR%spring-starter"
call mvnw.cmd spring-boot:run
