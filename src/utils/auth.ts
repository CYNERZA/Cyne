import { USE_BEDROCK, USE_VERTEX } from './model'
import { getGlobalConfig } from './config'

export function isOpenAIAuthEnabled(): boolean {
  return true
  // return !(USE_BEDROCK || USE_VERTEX)
}

export function isLoggedInToOpenAI(): boolean {
  return true
  // const config = getGlobalConfig()
  // return !!config.primaryApiKey
}

// Legacy functions - kept for compatibility
export function isAnthropicAuthEnabled(): boolean {
  return false
}

export function isLoggedInToAnthropic(): boolean {
  return false
}
