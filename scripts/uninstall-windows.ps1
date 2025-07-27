# Cyne Uninstallation Script for Windows
# This script removes Cyne and cleans up PATH entries

param(
    [Parameter(Mandatory=$false)]
    [string]$InstallPath = "$env:USERPROFILE\.cyne\bin",
    
    [Parameter(Mandatory=$false)]
    [switch]$SystemWide = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$KeepConfig = $false
)

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to remove directory from PATH
function Remove-FromPath {
    param(
        [string]$Directory,
        [bool]$IsSystemWide = $false
    )
    
    $target = if ($IsSystemWide) { "Machine" } else { "User" }
    $currentPath = [Environment]::GetEnvironmentVariable("Path", $target)
    
    # Split and filter PATH entries
    $pathEntries = $currentPath -split ';' | Where-Object { $_.Trim() -ne '' }
    $filteredEntries = $pathEntries | Where-Object { $_.ToLower() -ne $Directory.ToLower() }
    
    if ($filteredEntries.Count -eq $pathEntries.Count) {
        Write-Host "Directory $Directory was not found in PATH" -ForegroundColor Yellow
        return $true
    }
    
    # Update PATH
    $newPath = $filteredEntries -join ';'
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

# Main uninstallation logic
try {
    Write-Host "=== Cyne Windows Uninstaller ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if system-wide uninstallation requires admin privileges
    if ($SystemWide -and -not (Test-Administrator)) {
        Write-Host "ERROR: System-wide uninstallation requires administrator privileges." -ForegroundColor Red
        Write-Host "Please run this script as an administrator or remove the -SystemWide flag." -ForegroundColor Yellow
        exit 1
    }
    
    # Check if Cyne is installed
    $cyneExePath = Join-Path $InstallPath "cyne.cmd"
    if (-not (Test-Path $cyneExePath)) {
        Write-Host "Cyne does not appear to be installed at $InstallPath" -ForegroundColor Yellow
        
        # Still try to remove from PATH in case of partial installation
        Write-Host "Checking and cleaning up PATH entries..." -ForegroundColor Green
        Remove-FromPath -Directory $InstallPath -IsSystemWide $SystemWide
        
        Write-Host "Cleanup complete." -ForegroundColor Green
        exit 0
    }
    
    # Confirm uninstallation
    if (-not $Force) {
        $confirmation = Read-Host "Are you sure you want to uninstall Cyne? (y/N)"
        if ($confirmation -notmatch "^[Yy]$") {
            Write-Host "Uninstallation cancelled." -ForegroundColor Yellow
            exit 0
        }
    }
    
    # Remove from PATH
    Write-Host "Removing $InstallPath from PATH..." -ForegroundColor Green
    Remove-FromPath -Directory $InstallPath -IsSystemWide $SystemWide | Out-Null
    
    # Remove installation files
    if (Test-Path $InstallPath) {
        Write-Host "Removing installation files..." -ForegroundColor Green
        Remove-Item -Path $InstallPath -Recurse -Force
    }
    
    # Remove configuration directory (optional)
    $configPath = Join-Path ([Environment]::GetFolderPath("UserProfile")) ".cyne"
    if (-not $KeepConfig -and (Test-Path $configPath)) {
        $removeConfig = if ($Force) { $true } else {
            $confirmation = Read-Host "Remove configuration directory $configPath? (y/N)"
            $confirmation -match "^[Yy]$"
        }
        
        if ($removeConfig) {
            Write-Host "Removing configuration directory..." -ForegroundColor Green
            Remove-Item -Path $configPath -Recurse -Force
        } else {
            Write-Host "Keeping configuration directory: $configPath" -ForegroundColor Yellow
        }
    }
    
    # Try to uninstall via npm as well
    Write-Host "Attempting to uninstall via npm..." -ForegroundColor Green
    try {
        $npmUninstallResult = npm uninstall -g cyne 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully uninstalled via npm" -ForegroundColor Green
        } else {
            Write-Host "npm uninstall completed with warnings: $npmUninstallResult" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "npm uninstall failed (this is usually not critical): $_" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "=== Uninstallation Complete ===" -ForegroundColor Green
    Write-Host "Cyne has been removed from your system." -ForegroundColor Cyan
    Write-Host "You may need to restart your terminal/PowerShell for PATH changes to take effect." -ForegroundColor Yellow
    
} catch {
    Write-Host "ERROR: Uninstallation failed: $_" -ForegroundColor Red
    exit 1
}
