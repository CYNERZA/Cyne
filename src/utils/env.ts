import { execFileNoThrow } from './execFileNoThrow'
import { memoize } from 'lodash-es'
import { join } from 'path'
import { homedir } from 'os'
import { CONFIG_BASE_DIR, CONFIG_FILE } from '../constants/product'

// Base directory for all Cynerza cyner data files (except config.json for backwards compatibility)
export const CYNERZA_BASE_DIR =
  process.env.CYNERZA_CONFIG_DIR ?? join(homedir(), CONFIG_BASE_DIR)

export const CLAUDE_BASE_DIR = CYNERZA_BASE_DIR // for backwards compatibility

// Config and data paths
export const GLOBAL_CYNERZA_FILE = process.env.CYNERZA_CONFIG_DIR
  ? join(CYNERZA_BASE_DIR, 'config.json')
  : join(homedir(), CONFIG_FILE)

export const GLOBAL_CLAUDE_FILE = GLOBAL_CYNERZA_FILE // for backwards compatibility

export const MEMORY_DIR = join(CYNERZA_BASE_DIR, 'memory')

const getIsDocker = memoize(async (): Promise<boolean> => {
  // Check for .dockerenv file
  const { code } = await execFileNoThrow('test', ['-f', '/.dockerenv'])
  if (code !== 0) {
    return false
  }
  return process.platform === 'linux'
})

const hasInternetAccess = memoize(async (): Promise<boolean> => {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1000)

    await fetch('http://1.1.1.1', {
      method: 'HEAD',
      signal: controller.signal,
    })

    clearTimeout(timeout)
    return true
  } catch {
    return false
  }
})

// all of these should be immutable
export const env = {
  getIsDocker,
  hasInternetAccess,
  isCI: Boolean(process.env.CI),
  platform:
    process.platform === 'win32'
      ? 'windows'
      : process.platform === 'darwin'
        ? 'macos'
        : 'linux',
  nodeVersion: process.version,
  terminal: process.env.TERM_PROGRAM,
}
