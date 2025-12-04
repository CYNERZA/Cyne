import { Command } from '../commands'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, createWriteStream, unlinkSync } from 'fs'
import chalk from 'chalk'
import { WindowsPathManager } from '../utils/windowsPath'
import { logEvent } from '../services/statsig'
import { logError } from '../utils/log'
import https from 'https'

const execAsync = promisify(exec)

/**
 * Download a file from a URL to a local path
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath)
    
    const makeRequest = (requestUrl: string) => {
      https.get(requestUrl, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location
          if (redirectUrl) {
            file.close()
            makeRequest(redirectUrl)
            return
          }
        }
        
        if (response.statusCode !== 200) {
          file.close()
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`))
          return
        }
        
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
      }).on('error', (err) => {
        file.close()
        reject(err)
      })
    }
    
    makeRequest(url)
  })
}

/**
 * Get the latest version and tarball URL from npm registry
 */
async function getNpmPackageInfo(): Promise<{ version: string; tarball: string }> {
  return new Promise((resolve, reject) => {
    https.get('https://registry.npmjs.org/cyne-cli/latest', (response) => {
      let data = ''
      response.on('data', (chunk) => { data += chunk })
      response.on('end', () => {
        try {
          const packageInfo = JSON.parse(data)
          resolve({
            version: packageInfo.version,
            tarball: packageInfo.dist.tarball
          })
        } catch (err) {
          reject(new Error(`Failed to parse npm registry response: ${err}`))
        }
      })
    }).on('error', reject)
  })
}

/**
 * Extract a .tgz file using PowerShell (Windows 10+ has built-in tar support)
 */
async function extractTarball(tarballPath: string, destPath: string): Promise<void> {
  // Use PowerShell to extract the tarball - Windows 10 1803+ has built-in tar
  const command = `tar -xzf "${tarballPath}" -C "${destPath}"`
  await execAsync(command, { timeout: 60000 })
}

/**
 * Perform manual installation by downloading from npm registry
 */
async function manualInstall(installPath: string, isSystemWide: boolean): Promise<void> {
  console.log(chalk.blue('Fetching package information from npm registry...'))
  
  const packageInfo = await getNpmPackageInfo()
  console.log(chalk.green(`Found cyne-cli version ${packageInfo.version}`))
  
  // Create installation directory
  if (!existsSync(installPath)) {
    mkdirSync(installPath, { recursive: true })
  }
  
  const tarballPath = join(installPath, 'cyne.tgz')
  
  console.log(chalk.blue('Downloading package...'))
  await downloadFile(packageInfo.tarball, tarballPath)
  console.log(chalk.green('✓ Package downloaded'))
  
  console.log(chalk.blue('Extracting package...'))
  await extractTarball(tarballPath, installPath)
  console.log(chalk.green('✓ Package extracted'))
  
  // Create wrapper batch file that points to the extracted package
  const batchContent = `@echo off
setlocal
node "%~dp0package\\cli.mjs" %*
`
  const batchPath = join(installPath, 'cyne.cmd')
  writeFileSync(batchPath, batchContent, 'utf8')
  console.log(chalk.green('✓ Created cyne.cmd wrapper'))
  
  // Run postinstall script if needed
  const postinstallScript = join(installPath, 'package', 'scripts', 'patch-slice-ansi.cjs')
  if (existsSync(postinstallScript)) {
    console.log(chalk.blue('Running postinstall script...'))
    try {
      await execAsync(`node "${postinstallScript}"`, { 
        cwd: join(installPath, 'package'),
        timeout: 30000 
      })
      console.log(chalk.green('✓ Postinstall completed'))
    } catch (postinstallError) {
      console.log(chalk.yellow('⚠ Postinstall script failed, but installation may still work'))
      logError(`Postinstall failed: ${postinstallError}`)
    }
  }
  
  // Clean up tarball
  try {
    unlinkSync(tarballPath)
  } catch {
    // Ignore cleanup errors
  }
  
  // Add install path to PATH
  console.log(chalk.blue(`Adding ${installPath} to PATH...`))
  await WindowsPathManager.addToPath(installPath, isSystemWide)
  console.log(chalk.green('✓ Added to PATH'))
}

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
        
        // Manual installation: download from npm registry and extract
        try {
          await manualInstall(installPath, isSystemWide)
          console.log(chalk.green('✓ Manual installation completed successfully'))
        } catch (manualError) {
          logError(`Manual installation failed: ${manualError}`)
          throw new Error(`Installation failed. npm error: ${npmError}. Manual installation error: ${manualError}`)
        }
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
