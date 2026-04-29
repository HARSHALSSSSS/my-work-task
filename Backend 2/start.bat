@echo off
title SpeedCopy Backend
echo.
echo  ==========================================
echo   SpeedCopy Backend - Starting All Services
echo  ==========================================
echo.

:: Check MongoDB
echo [1/9] Checking MongoDB...
sc query MongoDB | find "RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
  echo  Starting MongoDB service...
  net start MongoDB >nul 2>&1
  timeout /t 2 /nobreak >nul
) else (
  echo  MongoDB is already running.
)

echo.
echo [2/9] Starting Gateway          (port 4000)...
start "SpeedCopy - Gateway"           cmd /k "cd /d %~dp0gateway && node src/server.js"

timeout /t 1 /nobreak >nul

echo [3/9] Starting Auth Service     (port 4001)...
start "SpeedCopy - Auth"              cmd /k "cd /d %~dp0services\auth-service && node src/server.js"

timeout /t 1 /nobreak >nul

echo [4/9] Starting User Service     (port 4002)...
start "SpeedCopy - User"              cmd /k "cd /d %~dp0services\user-service && node src/server.js"

timeout /t 1 /nobreak >nul

echo [5/9] Starting Product Service  (port 4003)...
start "SpeedCopy - Product"           cmd /k "cd /d %~dp0services\product-service && node src/server.js"

timeout /t 1 /nobreak >nul

echo [6/9] Starting Design Service   (port 4004)...
start "SpeedCopy - Design"            cmd /k "cd /d %~dp0services\design-service && node src/server.js"

timeout /t 1 /nobreak >nul

echo [7/9] Starting Order Service    (port 4005)...
start "SpeedCopy - Order"             cmd /k "cd /d %~dp0services\order-service && node src/server.js"

timeout /t 1 /nobreak >nul

echo [8/9] Starting Payment Service  (port 4006)...
start "SpeedCopy - Payment"           cmd /k "cd /d %~dp0services\payment-service && node src/server.js"

timeout /t 1 /nobreak >nul

echo [9/9] Starting Notification     (port 4007)...
start "SpeedCopy - Notification"      cmd /k "cd /d %~dp0services\notification-service && node src/server.js"

timeout /t 1 /nobreak >nul

echo [10/10] Starting Finance Service (port 4011)...
start "SpeedCopy - Finance"           cmd /k "cd /d %~dp0services\finance-service && node src/server.js"

timeout /t 1 /nobreak >nul

echo [11/11] Starting Admin Service    (port 4008)...
start "SpeedCopy - Admin"             cmd /k "cd /d %~dp0services\admin-service && node src/server.js"

echo.
echo  ==========================================
echo   All services started!
echo.
echo   Gateway:       http://localhost:4000
echo   Auth:          http://localhost:4001
echo   User:          http://localhost:4002
echo   Product:       http://localhost:4003
echo   Design:        http://localhost:4004
echo   Order:         http://localhost:4005
echo   Payment:       http://localhost:4006
echo   Notification:  http://localhost:4007
echo   Finance:       http://localhost:4011
echo   Admin:         http://localhost:4008
echo.
echo   Swagger Docs:  http://localhost:4000/api-docs
echo  ==========================================
echo.
echo  Waiting 5 seconds then running health check...
timeout /t 5 /nobreak >nul
node scripts/health-check.js
echo.
pause
