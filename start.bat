@echo off
pushd "%~dp0"
title EBM SERVER
color 0B

echo.
echo ============================================
echo      EBM SERVER - Inicializacao
echo ============================================
echo.

:: Detect Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] ERRO: Node.js nao encontrado no PATH.
    echo Por favor, instale o Node.js em: https://nodejs.org/
    pause
    exit /b
)

:: Get configured port from config.json or use 3005 default
set PORT=3005
if exist "data\config.json" (
    for /f "tokens=*" %%a in ('node utils\get-port.js') do set PORT=%%a
)

echo [*] Servidor configurado na porta: %PORT%
echo [*] Iniciando servidor...
echo.

:: Start the browser automatically in 2 seconds
start /b cmd /c "timeout /t 2 >nul && start http://localhost:%PORT%"

:: Start the server
node server.js

if %errorlevel% neq 0 (
    echo.
    echo [!] O servidor parou com erro (Codigo: %errorlevel%)
    popd
    pause
) else (
    popd
)
