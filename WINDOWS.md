# Cyne Windows Installation Guide

This guide helps you install and use Cyne on Windows systems.

## Quick Installation

### Method 1: Automatic Installation (Recommended)

1. **Download and run the installer:**
   ```powershell
   # Run this in PowerShell as Administrator (for system-wide) or regular user (for user-only)
   iwr -useb https://raw.githubusercontent.com/CYNERZA/cyne/main/scripts/install-windows.ps1 | iex
   ```

2. **Or download and run locally:**
   ```powershell
   # Download the installer
   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/CYNERZA/cyne/main/scripts/install-windows.ps1" -OutFile "install-cyne.ps1"
   
   # Run the installer
   .\install-cyne.ps1
   ```

### Method 2: Manual Installation

1. **Install Node.js** (if not already installed):
   - Download from [nodejs.org](https://nodejs.org/)
   - Use the LTS version

2. **Install Cyne via npm:**
   ```cmd
   npm install -g cyne
   ```

3. **Add to PATH** (if needed):
   ```powershell
   # Add npm global directory to PATH
   $npmPath = npm config get prefix
   $env:PATH += ";$npmPath"
   ```

## Usage

After installation, you can use Cyne from any terminal or PowerShell window:

```cmd
# Show help
cyne --help

# Start interactive session
cyne

# Run with a specific prompt
cyne "help me debug this error"

# Check version
cyne --version
```

## Windows-Specific Commands

Cyne includes Windows-specific commands for installation management:

```cmd
# Install Cyne (from within Cyne)
/install-windows

# Install system-wide (requires admin)
/install-windows --system-wide

# Uninstall Cyne
/uninstall-windows

# Uninstall but keep configuration
/uninstall-windows --keep-config
```

## Troubleshooting

### "cyne is not recognized as an internal or external command"

This means Cyne is not in your system PATH. Try:

1. **Restart your terminal/PowerShell window**
2. **Check if npm global directory is in PATH:**
   ```powershell
   npm config get prefix
   echo $env:PATH
   ```
3. **Add npm global directory to PATH manually:**
   ```powershell
   $npmPath = npm config get prefix
   [Environment]::SetEnvironmentVariable("Path", "$env:PATH;$npmPath", "User")
   ```

### PowerShell Execution Policy Issues

If you get execution policy errors:

```powershell
# Check current policy
Get-ExecutionPolicy

# Allow scripts for current user (recommended)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run specific script with bypass
powershell -ExecutionPolicy Bypass -File install-cyne.ps1
```

### Permission Issues

For system-wide installation:
1. **Run PowerShell as Administrator**
2. **Or use user-only installation** (doesn't require admin)

### Node.js Issues

- Ensure Node.js version 18+ is installed
- Restart terminal after Node.js installation
- Check with: `node --version`

## Uninstallation

### Automatic Uninstallation

```powershell
# Download and run uninstaller
iwr -useb https://raw.githubusercontent.com/CYNERZA/cyne/main/scripts/uninstall-windows.ps1 | iex

# Or from within Cyne
cyne
/uninstall-windows
```

### Manual Uninstallation

```cmd
# Remove via npm
npm uninstall -g cyne

# Clean up PATH entries manually if needed
# Remove any Cyne-related directories from your PATH environment variable
```

## Configuration

Cyne stores its configuration in:
- **User config:** `%USERPROFILE%\.cyne\`
- **Logs:** `%USERPROFILE%\.cyne\logs\`

## Windows Terminal Integration

For the best experience, use Cyne with:
- **Windows Terminal** (recommended)
- **PowerShell 7+**
- **VS Code integrated terminal**

## Support

If you encounter issues:

1. **Check the logs:** Look in `%USERPROFILE%\.cyne\logs\`
2. **Run diagnostics:** `cyne /doctor`
3. **Report issues:** [GitHub Issues](https://github.com/CYNERZA/cyne/issues)

## Advanced Configuration

### Custom Installation Path

```powershell
# Install to custom directory
.\install-windows.ps1 -InstallPath "C:\Tools\Cyne"

# System-wide with custom path
.\install-windows.ps1 -InstallPath "C:\Program Files\Cyne" -SystemWide
```

### Environment Variables

Set these environment variables for custom behavior:

- `CYNE_CONFIG_DIR`: Custom configuration directory
- `CYNE_LOG_LEVEL`: Set to `debug` for verbose logging
- `CYNE_NO_AUTO_UPDATE`: Set to `true` to disable auto-updates

---

**Note:** This Windows support is designed to work with PowerShell, Command Prompt, and Windows Terminal. Some features may require Windows 10 or later.
