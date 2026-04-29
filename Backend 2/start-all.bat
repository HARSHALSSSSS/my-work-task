@echo off
REM Start all backend services in separate windows

echo Starting SpeedCopy Backend Services...
echo.

REM Terminal 1: MongoDB
echo Starting MongoDB...
start "MongoDB" cmd /k mongod

REM Wait a bit for MongoDB to start
timeout /t 2 /nobreak

REM Terminal 2: Auth Service
echo Starting Auth Service (port 4001)...
start "Auth Service" cmd /k "cd services\auth-service && npm start"

REM Terminal 3: Finance Service
echo Starting Finance Service (port 4011)...
start "Finance Service" cmd /k "cd services\finance-service && npm start"

REM Terminal 4: Payment Service
echo Starting Payment Service (port 4006)...
start "Payment Service" cmd /k "cd services\payment-service && npm start"

REM Terminal 5: Product Service
echo Starting Product Service (port 4003)...
start "Product Service" cmd /k "cd services\product-service && npm start"

REM Terminal 6: Order Service
echo Starting Order Service (port 4005)...
start "Order Service" cmd /k "cd services\order-service && npm start"

REM Terminal 7: Admin Service
echo Starting Admin Service (port 4008)...
start "Admin Service" cmd /k "cd services\admin-service && npm start"

REM Wait for services to start
timeout /t 3 /nobreak

REM Terminal 8: Gateway
echo Starting Gateway (port 4000)...
start "Gateway" cmd /k "cd gateway && npm start"

echo.
echo All services started!
echo.
echo Services running on:
echo - MongoDB: localhost:27017
echo - Auth Service: localhost:4001
echo - Product Service: localhost:4003
echo - Order Service: localhost:4005
echo - Payment Service: localhost:4006
echo - Finance Service: localhost:4011
echo - Admin Service: localhost:4008
echo - Gateway: localhost:4000
echo.
pause
