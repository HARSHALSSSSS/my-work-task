@echo off
title SpeedCopy Backend - DEV MODE
echo.
echo  ==========================================
echo   SpeedCopy Backend - DEV MODE (nodemon)
echo  ==========================================
echo.

:: Check MongoDB
sc query MongoDB | find "RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
  echo  Starting MongoDB service...
  net start MongoDB >nul 2>&1
  timeout /t 2 /nobreak >nul
)

echo  Starting all services with nodemon...
echo.

start "SpeedCopy - Gateway"           cmd /k "cd /d %~dp0gateway && npx nodemon src/server.js"
timeout /t 1 /nobreak >nul
start "SpeedCopy - Auth"              cmd /k "cd /d %~dp0services\auth-service && npx nodemon src/server.js"
timeout /t 1 /nobreak >nul
start "SpeedCopy - User"              cmd /k "cd /d %~dp0services\user-service && npx nodemon src/server.js"
timeout /t 1 /nobreak >nul
start "SpeedCopy - Product"           cmd /k "cd /d %~dp0services\product-service && npx nodemon src/server.js"
timeout /t 1 /nobreak >nul
start "SpeedCopy - Design"            cmd /k "cd /d %~dp0services\design-service && npx nodemon src/server.js"
timeout /t 1 /nobreak >nul
start "SpeedCopy - Order"             cmd /k "cd /d %~dp0services\order-service && npx nodemon src/server.js"
timeout /t 1 /nobreak >nul
start "SpeedCopy - Payment"           cmd /k "cd /d %~dp0services\payment-service && npx nodemon src/server.js"
timeout /t 1 /nobreak >nul
start "SpeedCopy - Notification"      cmd /k "cd /d %~dp0services\notification-service && npx nodemon src/server.js"
timeout /t 1 /nobreak >nul
start "SpeedCopy - Admin"             cmd /k "cd /d %~dp0services\admin-service && npx nodemon src/server.js"

echo.
echo  All services started in DEV mode.
echo  Each service has its own terminal window.
echo.
timeout /t 6 /nobreak >nul
node scripts/health-check.js
echo.
pause
