@echo off
setlocal

REM Cyne CLI Wrapper for Windows
REM This batch file provides a better Windows experience for the Cyne CLI tool

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Find the Cyne executable
set "SCRIPT_DIR=%~dp0"
set "CYNE_SCRIPT="

REM Try different possible locations for the Cyne script
if exist "%SCRIPT_DIR%cli.mjs" (
    set "CYNE_SCRIPT=%SCRIPT_DIR%cli.mjs"
) else if exist "%SCRIPT_DIR%\cli.mjs" (
    set "CYNE_SCRIPT=%SCRIPT_DIR%\cli.mjs"
) else if exist "%SCRIPT_DIR%\..\cli.mjs" (
    set "CYNE_SCRIPT=%SCRIPT_DIR%\..\cli.mjs"
) else (
    REM Try npm global installation
    for /f "tokens=*" %%i in ('npm config get prefix 2^>nul') do (
        if exist "%%i\node_modules\cyne\cli.mjs" (
            set "CYNE_SCRIPT=%%i\node_modules\cyne\cli.mjs"
        )
    )
)

if "%CYNE_SCRIPT%"=="" (
    echo Error: Cyne installation not found
    echo Please ensure Cyne is properly installed via:
    echo   npm install -g cyne
    echo Or run the Windows installer script
    exit /b 1
)

REM Run Cyne with all passed arguments
node "%CYNE_SCRIPT%" %*
