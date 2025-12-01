import {
  getGlobalConfig,
  saveGlobalConfig,
  getCurrentProjectConfig,
  saveCurrentProjectConfig,
} from './config.js'
import { env } from './env'
import { getCwd } from './state'
import { queryHaiku } from '../services/cynerza'
import { exec } from 'child_process'
import { logError } from './log'
import { memoize, sample } from 'lodash-es'
import { promisify } from 'util'
import { getIsGit } from './git'

const execPromise = promisify(exec)

async function getFrequentlyModifiedFiles(): Promise<string[]> {
  if (process.env.NODE_ENV === 'test') return []
  if (!(await getIsGit())) return []

  try {
    let filenames = ''
    let userFilenames = ''
    // Look up files modified by the user's recent commits
    // Be careful to do it async, so it doesn't block the main thread
    
    if (env.platform === 'windows') {
      // Windows-compatible git command using PowerShell
      const { stdout } = await execPromise(
        'powershell -Command "git log -n 1000 --pretty=format: --name-only --diff-filter=M --author=$(git config user.email) | Where-Object {$_ -ne \'\'} | Group-Object | Sort-Object Count -Descending | Select-Object -First 20 | ForEach-Object {$_.Name}"',
        { cwd: getCwd(), encoding: 'utf8' },
      )
      userFilenames = stdout
    } else {
      // Unix-like systems
      const { stdout } = await execPromise(
        'git log -n 1000 --pretty=format: --name-only --diff-filter=M --author=$(git config user.email) | sort | uniq -c | sort -nr | head -n 20',
        { cwd: getCwd(), encoding: 'utf8' },
      )
      userFilenames = stdout
    }

    filenames = 'Files modified by user:\n' + userFilenames

    // Look at other users' commits if we don't have enough files
    if (userFilenames.split('\n').length < 10) {
      let allFilenamesCommand = ''
      if (env.platform === 'windows') {
        allFilenamesCommand = 'powershell -Command "git log -n 1000 --pretty=format: --name-only --diff-filter=M | Where-Object {$_ -ne \'\'} | Group-Object | Sort-Object Count -Descending | Select-Object -First 20 | ForEach-Object {$_.Name}"'
      } else {
        allFilenamesCommand = 'git log -n 1000 --pretty=format: --name-only --diff-filter=M | sort | uniq -c | sort -nr | head -n 20'
      }
      
      const { stdout: allFilenames } = await execPromise(
        allFilenamesCommand,
        { cwd: getCwd(), encoding: 'utf8' },
      )
      filenames += '\n\nFiles modified by other users:\n' + allFilenames
    }
    // For Windows compatibility, use simple file parsing instead of AI analysis
    logError('Using fallback file parsing for Windows compatibility')
    const lines = filenames.split('\n').filter(line => 
      line.trim() && !line.includes('Files modified')
    )
    return lines.slice(0, 5).map(line => {
      // Extract just the filename from lines that might have counts
      const parts = line.trim().split(/\s+/)
      return parts[parts.length - 1] || line.trim()
    })
  } catch (err) {
    logError(err)
    return []
  }
}

export const getExampleCommands = memoize(async (): Promise<string[]> => {
  const globalConfig = getGlobalConfig()
  const projectConfig = getCurrentProjectConfig()
  const now = Date.now()
  const lastGenerated = projectConfig.exampleFilesGeneratedAt ?? 0
  const oneWeek = 7 * 24 * 60 * 60 * 1000

  // Regenerate examples if they're over a week old
  if (now - lastGenerated > oneWeek) {
    projectConfig.exampleFiles = []
  }

  // Update global startup count
  const newGlobalConfig = {
    ...globalConfig,
    numStartups: (globalConfig.numStartups ?? 0) + 1,
  }
  saveGlobalConfig(newGlobalConfig)

  // // If no example files cached, kickstart fetch in background
  // if (!projectConfig.exampleFiles?.length) {
  //   getFrequentlyModifiedFiles().then(files => {
  //     if (files.length) {
  //       saveCurrentProjectConfig({
  //         ...getCurrentProjectConfig(),
  //         exampleFiles: files,
  //         exampleFilesGeneratedAt: Date.now(),
  //       })
  //     }
  //   })
  // }

  const frequentFile = projectConfig.exampleFiles?.length
    ? sample(projectConfig.exampleFiles)
    : '<filepath>'

  return [
    'fix lint errors',
    'fix typecheck errors',
    `how does ${frequentFile} work?`,
    `refactor ${frequentFile}`,
    'how do I log an error?',
    `edit ${frequentFile} to...`,
    `write a test for ${frequentFile}`,
    'create a util logging.py that...',
  ]
})
