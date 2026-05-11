@echo off
chcp 65001 >nul 2>&1
title Web File Explorer
color 0B

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     Web File Explorer - Inicializacao    ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ============================================
:: PASSO 1: Verificar/Instalar Node.js
:: ============================================

set "NODE_PATH="
set "NEED_INSTALL=0"

:: Check common locations
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_PATH=C:\Program Files\nodejs"
    goto :node_found
)
if exist "C:\Program Files (x86)\nodejs\node.exe" (
    set "NODE_PATH=C:\Program Files (x86)\nodejs"
    goto :node_found
)
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set "NODE_PATH=%LOCALAPPDATA%\Programs\nodejs"
    goto :node_found
)
if exist "%APPDATA%\nvm\current\node.exe" (
    set "NODE_PATH=%APPDATA%\nvm\current"
    goto :node_found
)

:: Check PATH
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('where node') do (
        set "NODE_PATH=%%~dpi"
        goto :node_found
    )
)

:: Node.js NOT found - install automatically
set "NEED_INSTALL=1"

echo  [!] Node.js nao encontrado no sistema.
echo.

:: Find installer in the installers folder
set "INSTALLER_DIR=%~dp0installers"
set "INSTALLER_FILE="

if not exist "%INSTALLER_DIR%" (
    echo  ERRO: Pasta "installers" nao encontrada!
    echo  Coloque o instalador do Node.js na pasta:
    echo  %INSTALLER_DIR%
    echo.
    pause
    exit /b 1
)

:: Find .msi installer
for %%f in ("%INSTALLER_DIR%\node*.msi") do (
    set "INSTALLER_FILE=%%f"
)

if "%INSTALLER_FILE%"=="" (
    echo  ERRO: Instalador do Node.js nao encontrado!
    echo  Coloque o arquivo node-vXX.XX.X-x64.msi na pasta:
    echo  %INSTALLER_DIR%
    echo.
    pause
    exit /b 1
)

echo  [*] Instalador encontrado: %INSTALLER_FILE%
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   Instalando Node.js automaticamente... ║
echo  ║   Aguarde, isso pode levar alguns       ║
echo  ║   minutos...                            ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Install Node.js silently (requires admin)
:: Try silent install first
msiexec /i "%INSTALLER_FILE%" /qn /norestart ADDLOCAL=ALL 2>nul
if %errorlevel% neq 0 (
    echo  [!] Instalacao silenciosa requer permissao de administrador.
    echo  [*] Abrindo instalador com interface grafica...
    echo  [*] Siga as instrucoes na tela para instalar.
    echo.
    msiexec /i "%INSTALLER_FILE%" /qb /norestart ADDLOCAL=ALL
    if %errorlevel% neq 0 (
        echo.
        echo  [!] Tentando instalar com privilegios elevados...
        echo.
        powershell -Command "Start-Process msiexec.exe -ArgumentList '/i', '\"%INSTALLER_FILE%\"', '/qb', '/norestart', 'ADDLOCAL=ALL' -Verb RunAs -Wait" 2>nul
    )
)

:: Wait a moment for installation to complete
timeout /t 3 /nobreak >nul

:: Refresh PATH after install
set "PATH=C:\Program Files\nodejs;%PATH%"

:: Verify installation
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_PATH=C:\Program Files\nodejs"
    echo.
    echo  [OK] Node.js instalado com sucesso!
    echo.
) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
    set "NODE_PATH=C:\Program Files (x86)\nodejs"
    echo.
    echo  [OK] Node.js instalado com sucesso!
    echo.
) else (
    echo.
    echo  ╔══════════════════════════════════════════╗
    echo  ║  ERRO: Instalacao do Node.js falhou!     ║
    echo  ║                                          ║
    echo  ║  Tente instalar manualmente:             ║
    echo  ║  Execute o arquivo na pasta installers   ║
    echo  ║  e depois rode este script novamente.    ║
    echo  ╚══════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)

:node_found

:: Add Node to PATH for this session
set "PATH=%NODE_PATH%;%PATH%"

for /f "tokens=*" %%i in ('"%NODE_PATH%\node.exe" -v') do set "NODE_VER=%%i"
echo  [1/4] Node.js %NODE_VER% ..... OK

:: ============================================
:: PASSO 2: Verificar npm
:: ============================================

if not exist "%NODE_PATH%\npm.cmd" (
    echo  [!] npm nao encontrado. Reinstale o Node.js.
    pause
    exit /b 1
)
echo  [2/4] npm .................. OK

:: ============================================
:: PASSO 3: Instalar dependencias do projeto
:: ============================================

if not exist "%~dp0node_modules" (
    echo  [3/4] Instalando dependencias do projeto...
    echo.
    call "%NODE_PATH%\npm.cmd" install --prefix "%~dp0."
    if %errorlevel% neq 0 (
        echo.
        echo  ERRO: Falha ao instalar dependencias!
        echo  Verifique sua conexao com a internet.
        pause
        exit /b 1
    )
    echo.
    echo  [3/4] Dependencias ........ OK
) else (
    echo  [3/4] Dependencias ........ OK
)

:: ============================================
:: PASSO 4: Verificar/Instalar FFmpeg
:: ============================================

if not exist "%~dp0ffmpeg.exe" (
    echo  [4/4] Instalando FFmpeg...
    
    :: Tentar encontrar na pasta de instaladores (caminho aninhado que vimos antes)
    set "FFMPEG_SRC=%~dp0installers\ffmpeg-master-latest-win64-gpl-shared\ffmpeg-master-latest-win64-gpl-shared\bin"
    
    if exist "%FFMPEG_SRC%\ffmpeg.exe" (
        copy /y "%FFMPEG_SRC%\*" "%~dp0" >nul
        echo  [4/4] FFmpeg instalado .... OK
    ) else (
        echo  [!] FFmpeg nao encontrado em installers.
        echo  [!] O monitoramento de cameras pode nao funcionar.
    )
) else (
    echo  [4/4] FFmpeg ............... OK
)

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   Tudo pronto! Iniciando servidor...    ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Open browser after a short delay
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:server_loop
:: Start server
"%NODE_PATH%\node.exe" "%~dp0server.js"
set "EXIT_CODE=%errorlevel%"

:: Exit code 99 = restart request from admin panel
if "%EXIT_CODE%"=="99" (
    echo.
    echo  [*] Reiniciando servidor...
    echo.
    timeout /t 2 /nobreak >nul
    goto :server_loop
)

:: Normal exit
echo.
echo  O servidor foi encerrado.
pause
