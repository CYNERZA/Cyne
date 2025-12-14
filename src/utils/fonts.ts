import { execSync, exec } from 'child_process'
import { existsSync, mkdirSync, createWriteStream, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir, platform } from 'os'
import https from 'https'

/**
 * Nerd Fonts Support Utility
 * Auto-detects and installs Nerd Fonts for premium CLI experience
 */

// Nerd Font icons for CLI
export const NERD_ICONS = {
  // Status
  success: '',  // nf-fa-check
  error: '',    // nf-fa-times
  warning: '',  // nf-fa-warning
  info: '',     // nf-fa-info_circle
  
  // Navigation
  arrowRight: '',  // nf-oct-arrow_right
  arrowDown: '',   // nf-oct-arrow_down
  chevronRight: '', // nf-oct-chevron_right
  
  // Files & Folders
  folder: '',      // nf-fa-folder
  folderOpen: '',  // nf-fa-folder_open
  file: '',        // nf-fa-file
  fileCode: '',    // nf-fa-file_code
  
  // Git
  git: '',         // nf-dev-git
  gitBranch: '',   // nf-dev-git_branch
  gitCommit: '',   // nf-oct-git_commit
  
  // Actions
  play: '',        // nf-fa-play
  pause: '',       // nf-fa-pause
  stop: '',        // nf-fa-stop
  refresh: '',     // nf-fa-refresh
  search: '',      // nf-fa-search
  cog: '',         // nf-fa-cog
  
  // UI
  moon: '',        // nf-weather-moon_waning_crescent_3
  sun: '',         // nf-weather-day_sunny
  palette: '',     // nf-fa-paint_brush
  terminal: '',    // nf-oct-terminal
  robot: 'ﮧ',       // nf-mdi-robot
  brain: '',       // nf-fa-brain (optional)
  
  // Spinners
  spinner: ['', '', '', ''],  // rotating circle
  dots: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
  
  // Misc
  check: '',
  cross: '',
  star: '',
  heart: '',
  lightning: '',
  clock: '',
}

// Fallback Unicode icons (works without Nerd Fonts)
export const UNICODE_ICONS = {
  success: '✔',
  error: '✖',
  warning: '⚠',
  info: 'ℹ',
  arrowRight: '→',
  arrowDown: '↓',
  chevronRight: '›',
  folder: '📁',
  folderOpen: '📂',
  file: '📄',
  fileCode: '📜',
  git: '⎇',
  gitBranch: '⎇',
  gitCommit: '●',
  play: '▶',
  pause: '⏸',
  stop: '⏹',
  refresh: '↻',
  search: '🔍',
  cog: '⚙',
  moon: '◐',
  sun: '○',
  palette: '●',
  terminal: '>_',
  robot: '🤖',
  brain: '🧠',
  spinner: ['◐', '◓', '◑', '◒'],
  dots: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
  check: '✓',
  cross: '✗',
  star: '★',
  heart: '♥',
  lightning: '⚡',
  clock: '⏱',
}

// Font configuration
const NERD_FONT_NAME = 'JetBrainsMono Nerd Font'
const NERD_FONT_FILE = 'JetBrainsMono.zip'
const NERD_FONT_URL = 'https://github.com/ryanoasis/nerd-fonts/releases/download/v3.1.1/JetBrainsMono.zip'

// Font installation paths by platform
function getFontDir(): string {
  const plat = platform()
  if (plat === 'darwin') {
    return join(homedir(), 'Library', 'Fonts')
  } else if (plat === 'win32') {
    return join(homedir(), 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts')
  } else {
    // Linux
    return join(homedir(), '.local', 'share', 'fonts')
  }
}

// Check if Nerd Fonts are installed
export function isNerdFontInstalled(): boolean {
  try {
    const plat = platform()
    
    if (plat === 'linux') {
      // Use fc-list to check for Nerd Font
      const result = execSync('fc-list | grep -i "Nerd" 2>/dev/null || true', { encoding: 'utf-8' })
      return result.includes('Nerd')
    } else if (plat === 'darwin') {
      // Check macOS fonts
      const result = execSync('system_profiler SPFontsDataType 2>/dev/null | grep -i "Nerd" || true', { encoding: 'utf-8' })
      return result.includes('Nerd')
    } else if (plat === 'win32') {
      // Check Windows fonts directory
      const fontDir = getFontDir()
      return existsSync(join(fontDir, 'JetBrainsMonoNerdFont-Regular.ttf'))
    }
    
    return false
  } catch {
    return false
  }
}

// Download file helper
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest)
    
    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          downloadFile(redirectUrl, dest).then(resolve).catch(reject)
          return
        }
      }
      
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    })
    
    request.on('error', (err) => {
      unlinkSync(dest)
      reject(err)
    })
  })
}

// Install Nerd Fonts
export async function installNerdFonts(onProgress?: (msg: string) => void): Promise<boolean> {
  const log = onProgress || console.log
  
  try {
    const fontDir = getFontDir()
    const tempDir = join(homedir(), '.cyne', 'temp')
    const zipPath = join(tempDir, NERD_FONT_FILE)
    
    // Create directories
    if (!existsSync(fontDir)) {
      mkdirSync(fontDir, { recursive: true })
    }
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true })
    }
    
    log('📥 Downloading JetBrainsMono Nerd Font...')
    
    // Download font
    await downloadFile(NERD_FONT_URL, zipPath)
    
    log('📦 Extracting fonts...')
    
    // Extract fonts
    const plat = platform()
    if (plat === 'win32') {
      // Windows: use PowerShell to extract
      execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${fontDir}' -Force"`)
    } else {
      // Unix: use unzip
      execSync(`unzip -o "${zipPath}" -d "${fontDir}"`, { stdio: 'pipe' })
    }
    
    log('🔄 Refreshing font cache...')
    
    // Refresh font cache
    if (plat === 'linux') {
      execSync('fc-cache -f', { stdio: 'pipe' })
    } else if (plat === 'darwin') {
      // macOS auto-refreshes fonts
    }
    
    // Cleanup
    unlinkSync(zipPath)
    
    log('✅ Nerd Fonts installed successfully!')
    log('💡 Restart your terminal to use the new fonts.')
    
    return true
  } catch (error) {
    log(`❌ Failed to install Nerd Fonts: ${error}`)
    return false
  }
}

// Get the appropriate icon set based on font availability
let _useNerdFonts: boolean | null = null

export function getIcons(): typeof NERD_ICONS | typeof UNICODE_ICONS {
  if (_useNerdFonts === null) {
    _useNerdFonts = isNerdFontInstalled()
  }
  return _useNerdFonts ? NERD_ICONS : UNICODE_ICONS
}

export function useNerdFonts(): boolean {
  if (_useNerdFonts === null) {
    _useNerdFonts = isNerdFontInstalled()
  }
  return _useNerdFonts
}

// Force refresh font detection
export function refreshFontDetection(): void {
  _useNerdFonts = null
}
