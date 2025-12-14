/**
 * Agent Coordinator - Manages inter-agent communication and consensus
 * 
 * Coordinates multiple agents, handles message passing between them,
 * and builds consensus from their recommendations.
 */

import { randomUUID, UUID } from 'crypto'
import { EventEmitter } from 'events'
import {
  Agent,
  AgentMessage,
  AgentResult,
  Conflict,
  ConsensusResult,
  Finding,
  Recommendation,
  VotingRecord,
} from '../types/agents'
import { BaseAgent, agentRegistry } from '../agents'

// ============================================================================
// Coordinator Configuration
// ============================================================================

export interface CoordinatorConfig {
  consensusThreshold: number // 0-1, percentage of agents that must agree
  enableVoting: boolean
  resolveConflictsAutomatically: boolean
  maxMessageHistory: number
}

const DEFAULT_CONFIG: CoordinatorConfig = {
  consensusThreshold: 0.5,
  enableVoting: true,
  resolveConflictsAutomatically: true,
  maxMessageHistory: 100,
}

// ============================================================================
// Agent Coordinator Class
// ============================================================================

export class AgentCoordinator extends EventEmitter {
  private config: CoordinatorConfig
  private messages: AgentMessage[] = []
  private activeAgents: Set<string> = new Set()

  constructor(config: Partial<CoordinatorConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // --------------------------------------------------------------------------
  // Message Passing
  // --------------------------------------------------------------------------

  /**
   * Send a message from one agent to another
   */
  sendMessage(
    fromAgent: string,
    toAgent: string | 'broadcast',
    type: AgentMessage['type'],
    content: unknown,
    correlationId?: UUID
  ): AgentMessage {
    const message: AgentMessage = {
      id: randomUUID(),
      fromAgent,
      toAgent,
      type,
      content,
      timestamp: Date.now(),
      correlationId,
    }

    this.messages.push(message)
    
    // Trim message history
    if (this.messages.length > this.config.maxMessageHistory) {
      this.messages = this.messages.slice(-this.config.maxMessageHistory)
    }

    this.emit('message', message)
    return message
  }

  /**
   * Broadcast a message to all active agents
   */
  broadcast(fromAgent: string, content: unknown): AgentMessage {
    return this.sendMessage(fromAgent, 'broadcast', 'notification', content)
  }

  /**
   * Get messages for a specific agent
   */
  getMessagesForAgent(agentId: string): AgentMessage[] {
    return this.messages.filter(
      m => m.toAgent === agentId || m.toAgent === 'broadcast'
    )
  }

  /**
   * Query another agent and wait for response
   */
  async queryAgent(
    fromAgent: string,
    toAgent: string,
    question: unknown,
    timeout: number = 30000
  ): Promise<AgentMessage | null> {
    const queryMessage = this.sendMessage(fromAgent, toAgent, 'query', question)
    
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), timeout)
      
      const handler = (message: AgentMessage) => {
        if (
          message.correlationId === queryMessage.id &&
          message.fromAgent === toAgent &&
          message.type === 'response'
        ) {
          clearTimeout(timer)
          this.off('message', handler)
          resolve(message)
        }
      }
      
      this.on('message', handler)
    })
  }

  // --------------------------------------------------------------------------
  // Consensus Building
  // --------------------------------------------------------------------------

  /**
   * Build consensus from multiple agent results
   */
  buildConsensus(results: Map<string, AgentResult>): ConsensusResult {
    const allRecommendations: Recommendation[] = []
    const recommendationVotes = new Map<string, VotingRecord[]>()
    const votingRecords: VotingRecord[] = []

    // Collect all recommendations and track which agents made them
    for (const [agentId, result] of results) {
      for (const rec of result.recommendations || []) {
        allRecommendations.push(rec)
        
        // Record vote for this recommendation
        const vote: VotingRecord = {
          agentId,
          recommendationId: rec.id,
          vote: 'approve',
          confidence: 1.0,
        }
        votingRecords.push(vote)
        
        const existing = recommendationVotes.get(rec.id) || []
        existing.push(vote)
        recommendationVotes.set(rec.id, existing)
      }
    }

    // Calculate consensus for each recommendation
    const totalAgents = results.size
    const consensusThreshold = Math.ceil(totalAgents * this.config.consensusThreshold)
    
    const mergedRecommendations: Recommendation[] = []
    const conflicts: Conflict[] = []
    
    // Group similar recommendations
    const recommendationGroups = this.groupSimilarRecommendations(allRecommendations)
    
    for (const group of recommendationGroups) {
      if (group.length >= consensusThreshold) {
        // Consensus reached - merge recommendations
        mergedRecommendations.push(this.mergeRecommendations(group))
      } else if (group.length > 1) {
        // Multiple recommendations but no consensus - flag as conflict
        const agentIds = group.map(r => {
          const votes = recommendationVotes.get(r.id)
          return votes?.map(v => v.agentId) || []
        }).flat()
        
        conflicts.push({
          id: randomUUID(),
          type: 'priority',
          agents: [...new Set(agentIds)],
          description: `Agents disagree on recommendation priority`,
          recommendations: group,
        })
      } else {
        // Single recommendation - include if from trusted agent
        mergedRecommendations.push(group[0])
      }
    }

    // Calculate agreement score
    const totalRecommendations = allRecommendations.length
    const agreedRecommendations = mergedRecommendations.length
    const agreementScore = totalRecommendations > 0 
      ? agreedRecommendations / totalRecommendations 
      : 1

    // Determine agreement level
    let agreementLevel: ConsensusResult['agreementLevel']
    if (agreementScore >= 0.9) agreementLevel = 'unanimous'
    else if (agreementScore >= 0.6) agreementLevel = 'majority'
    else if (agreementScore >= 0.3) agreementLevel = 'plurality'
    else agreementLevel = 'none'

    return {
      agreementLevel,
      agreementScore,
      mergedRecommendations,
      conflicts,
      votingRecord: votingRecords,
    }
  }

  /**
   * Group similar recommendations together
   */
  private groupSimilarRecommendations(
    recommendations: Recommendation[]
  ): Recommendation[][] {
    const groups: Recommendation[][] = []
    const used = new Set<string>()

    for (const rec of recommendations) {
      if (used.has(rec.id)) continue

      const group = [rec]
      used.add(rec.id)

      // Find similar recommendations
      for (const other of recommendations) {
        if (used.has(other.id)) continue
        
        if (this.areSimilarRecommendations(rec, other)) {
          group.push(other)
          used.add(other.id)
        }
      }

      groups.push(group)
    }

    return groups
  }

  /**
   * Check if two recommendations are similar
   */
  private areSimilarRecommendations(a: Recommendation, b: Recommendation): boolean {
    // Compare titles using simple similarity
    const titleA = a.title.toLowerCase()
    const titleB = b.title.toLowerCase()

    // Check for significant overlap in words
    const wordsA = new Set(titleA.split(/\s+/))
    const wordsB = new Set(titleB.split(/\s+/))
    
    let overlap = 0
    for (const word of wordsA) {
      if (wordsB.has(word)) overlap++
    }

    const similarity = overlap / Math.max(wordsA.size, wordsB.size)
    return similarity > 0.5
  }

  /**
   * Merge multiple similar recommendations into one
   */
  private mergeRecommendations(recommendations: Recommendation[]): Recommendation {
    if (recommendations.length === 1) return recommendations[0]

    // Use the recommendation with highest priority
    const priorityOrder = ['critical', 'high', 'medium', 'low']
    recommendations.sort((a, b) => 
      priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
    )

    const base = recommendations[0]
    
    // Merge descriptions
    const descriptions = recommendations.map(r => r.description)
    const uniqueDescriptions = [...new Set(descriptions)]

    return {
      ...base,
      description: uniqueDescriptions.join('\n\n'),
      relatedFindings: recommendations.flatMap(r => r.relatedFindings || []),
    }
  }

  // --------------------------------------------------------------------------
  // Finding Aggregation
  // --------------------------------------------------------------------------

  /**
   * Aggregate findings from multiple agents
   */
  aggregateFindings(results: Map<string, AgentResult>): Finding[] {
    const allFindings: Finding[] = []
    const findingMap = new Map<string, Finding[]>()

    // Collect all findings
    for (const result of results.values()) {
      for (const finding of result.findings || []) {
        allFindings.push(finding)
        
        // Group by location
        const key = finding.location 
          ? `${finding.location.file}:${finding.location.startLine}` 
          : finding.id
        
        const existing = findingMap.get(key) || []
        existing.push(finding)
        findingMap.set(key, existing)
      }
    }

    // Deduplicate and merge
    const mergedFindings: Finding[] = []
    
    for (const group of findingMap.values()) {
      if (group.length === 1) {
        mergedFindings.push(group[0])
      } else {
        // Multiple findings at same location - merge
        const merged = this.mergeFindings(group)
        mergedFindings.push(merged)
      }
    }

    // Sort by severity
    const severityOrder = ['critical', 'high', 'medium', 'low', 'info']
    mergedFindings.sort((a, b) => 
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
    )

    return mergedFindings
  }

  /**
   * Merge multiple findings into one
   */
  private mergeFindings(findings: Finding[]): Finding {
    if (findings.length === 1) return findings[0]

    // Use highest severity
    const severityOrder = ['critical', 'high', 'medium', 'low', 'info']
    findings.sort((a, b) => 
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
    )

    const base = findings[0]
    
    // Merge descriptions
    const descriptions = findings.map(f => f.description)
    const uniqueDescriptions = [...new Set(descriptions)]

    // Collect related findings
    const relatedFindings = findings
      .filter(f => f.id !== base.id)
      .map(f => f.id)

    return {
      ...base,
      description: uniqueDescriptions.join('\n\nAlso: '),
      relatedFindings: [...(base.relatedFindings || []), ...relatedFindings],
    }
  }

  // --------------------------------------------------------------------------
  // Conflict Resolution
  // --------------------------------------------------------------------------

  /**
   * Resolve conflicts between agent recommendations
   */
  resolveConflicts(conflicts: Conflict[]): Recommendation[] {
    const resolutions: Recommendation[] = []

    for (const conflict of conflicts) {
      if (conflict.recommendations.length === 0) continue

      // Strategy: Take the recommendation from the most specialized agent
      const specialization = ['security', 'performance', 'architect', 'analyst', 'documentation']
      
      let bestRec = conflict.recommendations[0]
      let bestScore = Infinity
      
      for (const rec of conflict.recommendations) {
        // Find which agent made this recommendation
        const agentId = conflict.agents.find(id => 
          agentRegistry.get(id)?.id === id
        )
        
        if (agentId) {
          const score = specialization.indexOf(agentId)
          if (score !== -1 && score < bestScore) {
            bestScore = score
            bestRec = rec
          }
        }
      }

      conflict.resolution = bestRec
      resolutions.push(bestRec)
    }

    return resolutions
  }

  // --------------------------------------------------------------------------
  // Agent Management
  // --------------------------------------------------------------------------

  /**
   * Register an agent as active
   */
  activateAgent(agentId: string): void {
    this.activeAgents.add(agentId)
    this.emit('agent_activated', agentId)
  }

  /**
   * Deactivate an agent
   */
  deactivateAgent(agentId: string): void {
    this.activeAgents.delete(agentId)
    this.emit('agent_deactivated', agentId)
  }

  /**
   * Get all active agents
   */
  getActiveAgents(): string[] {
    return Array.from(this.activeAgents)
  }

  /**
   * Clear all state
   */
  reset(): void {
    this.messages = []
    this.activeAgents.clear()
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let coordinatorInstance: AgentCoordinator | null = null

export function getAgentCoordinator(
  config?: Partial<CoordinatorConfig>
): AgentCoordinator {
  if (!coordinatorInstance) {
    coordinatorInstance = new AgentCoordinator(config)
  }
  return coordinatorInstance
}

export function resetAgentCoordinator(): void {
  coordinatorInstance = null
}
