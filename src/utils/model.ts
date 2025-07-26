import { memoize } from 'lodash-es'
import { getDynamicConfig, getExperimentValue } from '../services/statsig'
import { logError } from './log'
import { getGlobalConfig } from './config'

export const USE_BEDROCK = !!process.env.CYNERZA_USE_BEDROCK
export const USE_VERTEX = !!process.env.CYNERZA_USE_VERTEX

export interface ModelConfig {
  bedrock: string
  vertex: string
  firstParty: string
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  bedrock: 'gpt-4',
  vertex: 'gpt-4',
  // firstParty: 'gpt-4',
  firstParty: 'deepseek-chat',
}

// export const SMALL_FAST_MODEL = USE_BEDROCK
//   ? 'gpt-3.5-turbo'
//   : USE_VERTEX
//     ? 'gpt-3.5-turbo'
//     : 'gpt-3.5-turbo'

export const SMALL_FAST_MODEL = 'deepseek-chat'
/**
 * Helper to get the model config from statsig or defaults
 * Relies on the built-in caching from StatsigClient
 */
async function getModelConfig(): Promise<ModelConfig> {
  try {
    return await getDynamicConfig<ModelConfig>(
      'tengu-capable-model-config',
      DEFAULT_MODEL_CONFIG,
    )
  } catch (error) {
    logError(error)
    return DEFAULT_MODEL_CONFIG
  }
}

export const getSlowAndCapableModel = memoize(async (): Promise<string> => {
  const config = await getGlobalConfig()
  return config.smallModelName
})

export async function isDefaultSlowAndCapableModel(): Promise<boolean> {
  return (
    !process.env.OPENAI_MODEL ||
    process.env.OPENAI_MODEL === (await getSlowAndCapableModel())
  )
}

/**
 * Get the region for a specific Vertex model
 * Checks for hardcoded model-specific environment variables first,
 * then falls back to CLOUD_ML_REGION env var or default region
 */
export function getVertexRegion(model?: string): string | undefined {
  if (model?.startsWith('gpt-3.5')) {
    return process.env.VERTEX_REGION_GPT_3_5
  } else if (model?.startsWith('gpt-4')) {
    return process.env.VERTEX_REGION_GPT_4
  } else if (model?.startsWith('gpt-4o')) {
    return process.env.VERTEX_REGION_GPT_4O
  }
  return undefined
}
