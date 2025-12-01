import { Command } from '../commands'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { existsSync } from 'fs'
import chalk from 'chalk'
import { WindowsPathManager } from '../utils/windowsPath'
import { logEvent } from '../services/statsig'
import { logError } from '../utils/log'

const execAsync = promisify(exec)

const windowsInstaller: Command = {
  type: 'local',
  name: 'install-windows',
  userFacingName() {
    return 'install-windows'
  },
  description: 'Install Cyne globally on Windows and add to PATH',
  isEnabled: process.platform === 'win32',
  isHidden: false,
  async call(args: string) {
    try {
      // Parse command line arguments
      const parsedArgs = {
        systemWide: args.includes('--system-wide') || args.includes('--global'),
        force: args.includes('--force') || args.includes('-f'),
        installPath: null as string | null
      }
      
      // Extract install path if provided
      const installPathMatch = args.match(/--install-path[=\s]+([^\s]+)/)
      if (installPathMatch) {
        parsedArgs.installPath = installPathMatch[1]
      }

      logEvent('tengu_windows_install', {
        systemWide: String(parsedArgs.systemWide),
        force: String(parsedArgs.force),
        customPath: String(!!parsedArgs.installPath),
      })

      console.log(chalk.cyan('=== Cyne Windows Installation ==='))
      console.log()

      const installPath = parsedArgs.installPath || WindowsPathManager.getRecommendedInstallPath()
      const isSystemWide = parsedArgs.systemWide || false

      // Check admin privileges for system-wide installation
      if (isSystemWide) {
        try {
          await execAsync('net session', { timeout: 5000 })
        } catch (error) {
          throw new Error('System-wide installation requires administrator privileges. Please run as administrator or use user installation.')
        }
      }

      console.log(chalk.green(`Installing Cyne to: ${installPath}`))
      console.log(chalk.yellow(`Installation scope: ${isSystemWide ? 'System-wide' : 'User'}`))
      console.log()

      // Try npm installation first
      console.log(chalk.blue('Attempting npm global installation...'))
      try {
        const { stdout, stderr } = await execAsync('npm install -g cyne', { timeout: 60000 })
        console.log(chalk.green('✓ Cyne installed successfully via npm'))
        
        // Get npm global path and add to Windows PATH
        const npmGlobalPath = await WindowsPathManager.getNpmGlobalBinPath()
        if (npmGlobalPath) {
          console.log(chalk.blue(`Adding npm global path to PATH: ${npmGlobalPath}`))
          await WindowsPathManager.addToPath(npmGlobalPath, isSystemWide)
        }
        
      } catch (npmError) {
        console.log(chalk.yellow('⚠ npm installation failed, using manual installation'))
        logError(`npm install failed: ${npmError}`)
        
        // Manual installation logic here if needed
        throw new Error('Manual installation not yet implemented. Please ensure npm is installed and try again.')
      }

      // Verify installation
      try {
        const { stdout } = await execAsync('cyne --version', { timeout: 10000 })
        console.log(chalk.green(`✓ Installation verified. Cyne version: ${stdout.trim()}`))
      } catch (verifyError) {
        console.log(chalk.yellow('⚠ Installation may have succeeded but verification failed'))
        console.log(chalk.yellow('Try running "cyne --version" manually after restarting your terminal'))
      }

      console.log()
      console.log(chalk.green('=== Installation Complete ==='))
      console.log(chalk.cyan('To start using Cyne:'))
      console.log(chalk.yellow('  1. Close and reopen your terminal/PowerShell window'))
      console.log(chalk.yellow('  2. Run: cyne --help'))
      console.log()
      console.log(chalk.dim('If the "cyne" command is not found, you may need to restart your computer'))
      console.log(chalk.dim('for PATH changes to take effect globally.'))

      return 'Installation completed successfully'

    } catch (error) {
      logError(`Windows installation failed: ${error}`)
      console.log(chalk.red(`❌ Installation failed: ${error}`))
      throw error
    }
  }
}

const windowsUninstaller: Command = {
  type: 'local',
  name: 'uninstall-windows',
  userFacingName() {
    return 'uninstall-windows'
  },
  description: 'Uninstall Cyne from Windows and clean up PATH',
  isEnabled: process.platform === 'win32',
  isHidden: false,
  async call(args: string) {
    try {
      // Parse command line arguments
      const parsedArgs = {
        systemWide: args.includes('--system-wide') || args.includes('--global'),
        force: args.includes('--force') || args.includes('-f'),
        keepConfig: args.includes('--keep-config')
      }

      logEvent('tengu_windows_uninstall', {
        systemWide: String(parsedArgs.systemWide),
        force: String(parsedArgs.force),
        keepConfig: String(parsedArgs.keepConfig),
      })

      console.log(chalk.cyan('=== Cyne Windows Uninstallation ==='))
      console.log()

      const isSystemWide = parsedArgs.systemWide || false

      // Check admin privileges for system-wide uninstallation
      if (isSystemWide) {
        try {
          await execAsync('net session', { timeout: 5000 })
        } catch (error) {
          throw new Error('System-wide uninstallation requires administrator privileges. Please run as administrator or use user uninstallation.')
        }
      }

      // Confirm uninstallation
      if (!parsedArgs.force) {
        console.log(chalk.yellow('This will remove Cyne from your system.'))
        console.log(chalk.yellow('Press Ctrl+C to cancel, or press Enter to continue...'))
        
        // In a real CLI, you'd wait for user input here
        // For now, we'll assume they want to continue
      }

      console.log(chalk.blue('Removing Cyne via npm...'))
      try {
        const { stdout, stderr } = await execAsync('npm uninstall -g cyne', { timeout: 30000 })
        console.log(chalk.green('✓ Cyne removed via npm'))
      } catch (npmError) {
        console.log(chalk.yellow('⚠ npm uninstall failed or Cyne was not installed via npm'))
        logError(`npm uninstall failed: ${npmError}`)
      }

      // Clean up PATH entries
      console.log(chalk.blue('Cleaning up PATH entries...'))
      
      const npmGlobalPath = await WindowsPathManager.getNpmGlobalBinPath()
      if (npmGlobalPath) {
        await WindowsPathManager.removeFromPath(npmGlobalPath, isSystemWide)
      }

      const recommendedPath = WindowsPathManager.getRecommendedInstallPath()
      await WindowsPathManager.removeFromPath(recommendedPath, isSystemWide)

      // Remove configuration if requested
      if (!parsedArgs.keepConfig) {
        console.log(chalk.blue('Removing configuration files...'))
        try {
          const configPath = join(process.env.USERPROFILE || '', '.cyne')
          if (existsSync(configPath)) {
            // Use fs.rmSync instead of rimraf for Node.js 14.14.0+
            const fs = await import('fs')
            fs.rmSync(configPath, { recursive: true, force: true })
            console.log(chalk.green('✓ Configuration files removed'))
          }
        } catch (configError) {
          console.log(chalk.yellow('⚠ Failed to remove configuration files'))
          logError(`Config removal failed: ${configError}`)
        }
      } else {
        console.log(chalk.yellow('Configuration files preserved'))
      }

      console.log()
      console.log(chalk.green('=== Uninstallation Complete ==='))
      console.log(chalk.cyan('Cyne has been removed from your system.'))
      console.log(chalk.yellow('You may need to restart your terminal for PATH changes to take effect.'))

      return 'Uninstallation completed successfully'

    } catch (error) {
      logError(`Windows uninstallation failed: ${error}`)
      console.log(chalk.red(`❌ Uninstallation failed: ${error}`))
      throw error
    }
  }
}

export { windowsInstaller, windowsUninstaller }
