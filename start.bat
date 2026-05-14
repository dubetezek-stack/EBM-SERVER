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

:: Encerrar instâncias anteriores para evitar conflito de porta
taskkill /F /IM node.exe /T 2>nul

:run
:: Get configured port
set PORT=3000
for /f "tokens=*" %%a in ('node utils\get-port.js') do set PORT=%%a

echo [*] Servidor configurado na porta: %PORT%
echo [*] Iniciando servidor...
echo.

:: Start the browser automatically in 2 seconds (skip if running as background task)
if "%EBMSERVER_TASK%"=="" (
    start /b cmd /c "timeout /t 2 >nul && start http://localhost:%PORT%"
)

:: Start the server
node server.js

:: Handle Restart (Code 99)
if %errorlevel% equ 99 (
    echo.
    echo [*] Reiniciando servidor...
    echo.
    goto run
)

if %errorlevel% neq 0 (
    echo.
    echo [!] O servidor parou com erro (Codigo: %errorlevel%)
    popd
    pause
) else (
    popd
)
