/**
 * In-memory credential storage
 * API keys and base URLs are NEVER persisted to disk
 * They are populated by syncConfigFromBackend() and kept only in RAM
 */

interface MemoryConfig {
  apiKey?: string
  baseURL?: string
  provider?: string
  model?: string
}

// In-memory storage - never written to disk
let memoryConfig: MemoryConfig = {}

/**
 * Set credentials in memory (called by syncConfigFromBackend)
 */
export function setMemoryCredentials(config: MemoryConfig): void {
  memoryConfig = { ...config }
}

/**
 * Get API key from memory
 */
export function getMemoryApiKey(): string | null {
  return memoryConfig.apiKey || null
}

/**
 * Get base URL from memory
 */
export function getMemoryBaseURL(): string | null {
  return memoryConfig.baseURL || null
}

/**
 * Clear memory (on logout)
 */
export function clearMemoryCredentials(): void {
  memoryConfig = {}
}

/**
 * Check if we have credentials in memory
 */
export function hasMemoryCredentials(): boolean {
  return !!(memoryConfig.apiKey || memoryConfig.baseURL)
}
