# Cyne Installation Script for Windows
# This script installs Cyne globally and adds it to the PATH

param(
    [Parameter(Mandatory=$false)]
    [string]$InstallPath = "$env:USERPROFILE\.cyne\bin",
    
    [Parameter(Mandatory=$false)]
    [switch]$SystemWide = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force = $false
)

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to add directory to PATH
function Add-ToPath {
    param(
        [string]$Directory,
        [bool]$IsSystemWide = $false
    )
    
    $target = if ($IsSystemWide) { "Machine" } else { "User" }
    $currentPath = [Environment]::GetEnvironmentVariable("Path", $target)
    
    # Check if already in PATH
    $pathEntries = $currentPath -split ';' | Where-Object { $_.Trim() -ne '' }
    $isAlreadyInPath = $pathEntries | Where-Object { $_.ToLower() -eq $Directory.ToLower() }
    
    if ($isAlreadyInPath) {
        Write-Host "Directory $Directory is already in PATH" -ForegroundColor Yellow
        return $true
    }
    
    # Add to PATH
    $newPath = if ($currentPath) { "$currentPath;$Directory" } else { $Directory }
    [Environment]::SetEnvironmentVariable("Path", $newPath, $target)
    
    # Broadcast environment change
    $HWND_BROADCAST = [IntPtr]0xffff
    $WM_SETTINGCHANGE = 0x1a
    $result = [UIntPtr]::Zero
    
    Add-Type -TypeDefinition @'
    using System;
    using System.Runtime.InteropServices;
    public class Win32 {
        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern IntPtr SendMessageTimeout(
            IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
            uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
    }
'@
    
    [Win32]::SendMessageTimeout($HWND_BROADCAST, $WM_SETTINGCHANGE, [UIntPtr]::Zero, "Environment", 2, 5000, [ref]$result) | Out-Null
    
    return $true
}

# Main installation logic
try {
    Write-Host "=== Cyne Windows Installer ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if system-wide installation requires admin privileges
    if ($SystemWide -and -not (Test-Administrator)) {
        Write-Host "ERROR: System-wide installation requires administrator privileges." -ForegroundColor Red
        Write-Host "Please run this script as an administrator or remove the -SystemWide flag." -ForegroundColor Yellow
        exit 1
    }
    
    # Create installation directory
    if (-not (Test-Path $InstallPath)) {
        Write-Host "Creating installation directory: $InstallPath" -ForegroundColor Green
        New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    }
    
    # Check if Cyne is already installed
    $cyneExePath = Join-Path $InstallPath "cyne.cmd"
    if ((Test-Path $cyneExePath) -and -not $Force) {
        Write-Host "Cyne is already installed at $InstallPath" -ForegroundColor Yellow
        Write-Host "Use -Force to reinstall" -ForegroundColor Yellow
        exit 0
    }
    
    # Install via npm
    Write-Host "Installing Cyne via npm..." -ForegroundColor Green
    try {
        $npmInstallResult = npm install -g cyne 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed: $npmInstallResult"
        }
        Write-Host "Cyne installed successfully via npm" -ForegroundColor Green
    } catch {
        Write-Host "Failed to install via npm: $_" -ForegroundColor Red
        Write-Host "Continuing with manual installation..." -ForegroundColor Yellow
    }
    
    # Get npm global bin path
    $npmGlobalPath = $null
    try {
        $npmPrefix = npm config get prefix 2>$null
        if ($npmPrefix -and $npmPrefix -ne "undefined") {
            $npmGlobalPath = $npmPrefix
            Write-Host "Found npm global path: $npmGlobalPath" -ForegroundColor Green
        }
    } catch {
        Write-Host "Could not determine npm global path" -ForegroundColor Yellow
    }
    
    # Create batch file wrapper for Cyne
    $batchContent = @"
@echo off
setlocal

REM Try to run from npm global installation first
if exist "$npmGlobalPath\cyne.cmd" (
    "%~dp0\..\..\..\cyne.cmd" %*
    goto :eof
)

if exist "$npmGlobalPath\node_modules\cyne\cli.mjs" (
    node "$npmGlobalPath\node_modules\cyne\cli.mjs" %*
    goto :eof
)

REM Fallback to local installation
if exist "%~dp0\cli.mjs" (
    node "%~dp0\cli.mjs" %*
    goto :eof
)

echo Error: Cyne installation not found
echo Please reinstall Cyne or check your installation
exit /b 1
"@
    
    Write-Host "Creating Cyne wrapper script..." -ForegroundColor Green
    Set-Content -Path $cyneExePath -Value $batchContent -Encoding ASCII
    
    # Add to PATH
    Write-Host "Adding $InstallPath to PATH..." -ForegroundColor Green
    $pathAdded = Add-ToPath -Directory $InstallPath -IsSystemWide $SystemWide
    
    if ($pathAdded) {
        Write-Host ""
        Write-Host "=== Installation Complete ===" -ForegroundColor Green
        Write-Host "Cyne has been installed to: $InstallPath" -ForegroundColor Cyan
        Write-Host "The directory has been added to your PATH." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To start using Cyne, either:" -ForegroundColor Yellow
        Write-Host "  1. Close and reopen your terminal/PowerShell window" -ForegroundColor Yellow
        Write-Host "  2. Or run: `$env:PATH += ';$InstallPath'" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Then run: cyne --help" -ForegroundColor Cyan
    } else {
        Write-Host "WARNING: Failed to add to PATH. You may need to add $InstallPath manually." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERROR: Installation failed: $_" -ForegroundColor Red
    exit 1
}
