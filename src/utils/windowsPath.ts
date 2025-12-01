import { execSync, spawn } from 'child_process'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { logError } from './log'

export class WindowsPathManager {
  private static readonly REGISTRY_USER_PATH = 'HKCU\\Environment'
  private static readonly REGISTRY_SYSTEM_PATH = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment'
  
  /**
   * Add a directory to the Windows PATH environment variable
   * @param directory The directory to add to PATH
   * @param isSystemWide Whether to add to system PATH (requires admin) or user PATH
   */
  static async addToPath(directory: string, isSystemWide: boolean = false): Promise<boolean> {
    try {
      if (process.platform !== 'win32') {
        throw new Error('This function only works on Windows')
      }

      if (!existsSync(directory)) {
        throw new Error(`Directory does not exist: ${directory}`)
      }

      const registryKey = isSystemWide ? this.REGISTRY_SYSTEM_PATH : this.REGISTRY_USER_PATH
      const currentPath = await this.getCurrentPath(isSystemWide)
      
      // Check if directory is already in PATH
      const pathEntries = currentPath.split(';').map(p => p.trim()).filter(p => p)
      const normalizedDirectory = directory.toLowerCase()
      const isAlreadyInPath = pathEntries.some(entry => 
        entry.toLowerCase() === normalizedDirectory
      )

      if (isAlreadyInPath) {
        console.log(`Directory ${directory} is already in PATH`)
        return true
      }

      // Add directory to PATH
      const newPath = currentPath ? `${currentPath};${directory}` : directory
      
      // Use PowerShell to update the registry
      const command = `[Environment]::SetEnvironmentVariable("Path", "${newPath.replace(/"/g, '""')}", "${isSystemWide ? 'Machine' : 'User'}")`
      
      await this.runPowerShellCommand(command)
      
      // Broadcast WM_SETTINGCHANGE to update environment
      await this.broadcastEnvironmentChange()
      
      console.log(`Successfully added ${directory} to ${isSystemWide ? 'system' : 'user'} PATH`)
      return true
      
    } catch (error) {
      logError(`Failed to add directory to PATH: ${error}`)
      return false
    }
  }

  /**
   * Remove a directory from the Windows PATH environment variable
   * @param directory The directory to remove from PATH
   * @param isSystemWide Whether to remove from system PATH or user PATH
   */
  static async removeFromPath(directory: string, isSystemWide: boolean = false): Promise<boolean> {
    try {
      if (process.platform !== 'win32') {
        throw new Error('This function only works on Windows')
      }

      const currentPath = await this.getCurrentPath(isSystemWide)
      const pathEntries = currentPath.split(';').map(p => p.trim()).filter(p => p)
      const normalizedDirectory = directory.toLowerCase()
      
      // Filter out the directory to remove
      const filteredEntries = pathEntries.filter(entry => 
        entry.toLowerCase() !== normalizedDirectory
      )

      if (filteredEntries.length === pathEntries.length) {
        console.log(`Directory ${directory} was not found in PATH`)
        return true
      }

      const newPath = filteredEntries.join(';')
      
      // Use PowerShell to update the registry
      const command = `[Environment]::SetEnvironmentVariable("Path", "${newPath.replace(/"/g, '""')}", "${isSystemWide ? 'Machine' : 'User'}")`
      
      await this.runPowerShellCommand(command)
      
      // Broadcast WM_SETTINGCHANGE to update environment
      await this.broadcastEnvironmentChange()
      
      console.log(`Successfully removed ${directory} from ${isSystemWide ? 'system' : 'user'} PATH`)
      return true
      
    } catch (error) {
      logError(`Failed to remove directory from PATH: ${error}`)
      return false
    }
  }

  /**
   * Check if a directory is in the PATH
   */
  static async isInPath(directory: string, isSystemWide: boolean = false): Promise<boolean> {
    try {
      const currentPath = await this.getCurrentPath(isSystemWide)
      const pathEntries = currentPath.split(';').map(p => p.trim()).filter(p => p)
      const normalizedDirectory = directory.toLowerCase()
      
      return pathEntries.some(entry => entry.toLowerCase() === normalizedDirectory)
    } catch (error) {
      logError(`Failed to check PATH: ${error}`)
      return false
    }
  }

  /**
   * Get the current PATH value from registry
   */
  private static async getCurrentPath(isSystemWide: boolean): Promise<string> {
    const command = `[Environment]::GetEnvironmentVariable("Path", "${isSystemWide ? 'Machine' : 'User'}")`
    const result = await this.runPowerShellCommand(command)
    return result.trim()
  }

  /**
   * Run a PowerShell command and return the output
   */
  private static async runPowerShellCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const powershell = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-Command', command
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      powershell.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      powershell.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      powershell.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(`PowerShell command failed with code ${code}: ${stderr}`))
        }
      })

      powershell.on('error', (error) => {
        reject(error)
      })
    })
  }

  /**
   * Broadcast environment change to update PATH in running processes
   */
  private static async broadcastEnvironmentChange(): Promise<void> {
    try {
      const command = `
        Add-Type -TypeDefinition '
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
          [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
          public static extern IntPtr SendMessageTimeout(
            IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
            uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
        }
        ';
        $HWND_BROADCAST = [IntPtr]0xffff;
        $WM_SETTINGCHANGE = 0x1a;
        $result = [UIntPtr]::Zero;
        [Win32]::SendMessageTimeout($HWND_BROADCAST, $WM_SETTINGCHANGE, [UIntPtr]::Zero, "Environment", 2, 5000, [ref]$result);
      `
      
      await this.runPowerShellCommand(command)
    } catch (error) {
      // Non-critical error, just log it
      logError(`Failed to broadcast environment change: ${error}`)
    }
  }

  /**
   * Get the recommended installation directory for Cyne
   */
  static getRecommendedInstallPath(): string {
    const userProfile = process.env.USERPROFILE || homedir()
    return join(userProfile, '.cyne', 'bin')
  }

  /**
   * Get the global npm bin directory
   */
  static async getNpmGlobalBinPath(): Promise<string | null> {
    try {
      const result = await this.runPowerShellCommand('npm config get prefix')
      const npmPrefix = result.trim()
      if (npmPrefix && npmPrefix !== 'undefined') {
        return npmPrefix
      }
      return null
    } catch (error) {
      logError(`Failed to get npm global bin path: ${error}`)
      return null
    }
  }
}
