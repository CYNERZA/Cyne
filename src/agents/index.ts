/**
 * Agents Module Index - Exports all specialized agents
 */

export { BaseAgent, type AgentConfig } from './BaseAgent'
export { SecurityAgent, securityAgent } from './SecurityAgent'
export { PerformanceAgent, performanceAgent } from './PerformanceAgent'
export { ArchitectAgent, architectAgent } from './ArchitectAgent'
export { CodeAnalystAgent, codeAnalystAgent } from './CodeAnalystAgent'
export { DocumentationAgent, documentationAgent } from './DocumentationAgent'

// Re-export types
export type {
  Agent,
  AgentCapability,
  AgentResult,
  AgentTask,
  Finding,
  Recommendation,
  Severity,
  Priority,
} from '../types/agents'

// Agent registry for easy access
import { securityAgent } from './SecurityAgent'
import { performanceAgent } from './PerformanceAgent'
import { architectAgent } from './ArchitectAgent'
import { codeAnalystAgent } from './CodeAnalystAgent'
import { documentationAgent } from './DocumentationAgent'
import { BaseAgent } from './BaseAgent'

export const agentRegistry: Map<string, BaseAgent> = new Map([
  ['security', securityAgent],
  ['performance', performanceAgent],
  ['architect', architectAgent],
  ['analyst', codeAnalystAgent],
  ['documentation', documentationAgent],
])

/**
 * Get an agent by ID
 */
export function getAgent(agentId: string): BaseAgent | undefined {
  return agentRegistry.get(agentId)
}

/**
 * Get all available agents
 */
export function getAllAgents(): BaseAgent[] {
  return Array.from(agentRegistry.values())
}

/**
 * Register a custom agent
 */
export function registerAgent(agent: BaseAgent): void {
  agentRegistry.set(agent.id, agent)
}
