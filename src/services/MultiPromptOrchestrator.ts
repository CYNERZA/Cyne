/**
 * Multi-Prompt Orchestrator - Core orchestration engine for Cyne
 * 
 * This service manages the execution of multiple prompts across specialized agents,
 * providing intelligent routing, parallel execution, and result aggregation.
 */

import { randomUUID, UUID } from 'crypto'
import { EventEmitter } from 'events'
import {
  Agent,
  AgentResult,
  AgentTask,
  AggregationMethod,
  Checkpoint,
  ExecutionStrategy,
  OrchestrationEvent,
  OrchestrationEventListener,
  OrchestrationPlan,
  Priority,
  PromptTask,
  TaskStatus,
} from '../types/agents'

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONCURRENCY = 4
const DEFAULT_TIMEOUT = 120000 // 2 minutes
const PROGRESS_UPDATE_INTERVAL = 500 // ms

// ============================================================================
// Orchestrator Configuration
// ============================================================================

export interface OrchestratorConfig {
  maxConcurrency: number
  defaultTimeout: number
  enableCheckpoints: boolean
  checkpointInterval: number
  retryFailedTasks: boolean
  maxRetries: number
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrency: DEFAULT_CONCURRENCY,
  defaultTimeout: DEFAULT_TIMEOUT,
  enableCheckpoints: true,
  checkpointInterval: 30000, // 30 seconds
  retryFailedTasks: true,
  maxRetries: 2,
}

// ============================================================================
// Multi-Prompt Orchestrator Class
// ============================================================================

export class MultiPromptOrchestrator extends EventEmitter {
  private config: OrchestratorConfig
  private agents: Map<string, Agent> = new Map()
  private activeTasks: Map<UUID, AgentTask> = new Map()
  private taskQueue: PromptTask[] = []
  private checkpoints: Map<UUID, Checkpoint> = new Map()
  private isRunning = false
  private eventListeners: Set<OrchestrationEventListener> = new Set()

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // --------------------------------------------------------------------------
  // Agent Registration
  // --------------------------------------------------------------------------

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent)
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): boolean {
    return this.agents.delete(agentId)
  }

  /**
   * Get all registered agents
   */
  getAgents(): Agent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId)
  }

  // --------------------------------------------------------------------------
  // Plan Creation
  // --------------------------------------------------------------------------

  /**
   * Create an orchestration plan from user input
   */
  async createPlan(
    input: string,
    options: {
      strategy?: ExecutionStrategy
      aggregation?: AggregationMethod
      targetAgents?: string[]
      priority?: Priority
    } = {}
  ): Promise<OrchestrationPlan> {
    const {
      strategy = 'adaptive',
      aggregation = 'merge',
      targetAgents,
      priority = 'medium',
    } = options

    // Decompose input into tasks
    const tasks = await this.decomposeInput(input, targetAgents, priority)

    // Determine optimal execution strategy
    const executionStrategy = strategy === 'adaptive' 
      ? this.determineOptimalStrategy(tasks)
      : strategy

    // Create plan
    const plan: OrchestrationPlan = {
      id: randomUUID(),
      tasks,
      executionStrategy,
      aggregationMethod: aggregation,
      timeout: this.config.defaultTimeout * tasks.length,
      checkpoints: [],
    }

    this.emitEvent({ type: 'plan_created', plan })
    return plan
  }

  /**
   * Decompose user input into individual prompt tasks
   */
  private async decomposeInput(
    input: string,
    targetAgents?: string[],
    priority: Priority = 'medium'
  ): Promise<PromptTask[]> {
    const tasks: PromptTask[] = []

    // Check for explicit multi-task markers
    const multiTaskPatterns = [
      /\bAND\b/gi,
      /\b(?:also|additionally|furthermore)\b/gi,
      /\d+\.\s+/g, // Numbered lists
      /[•\-\*]\s+/g, // Bullet points
    ]

    let subPrompts: string[] = [input]

    // Split on AND keywords
    if (/\bAND\b/i.test(input)) {
      subPrompts = input.split(/\s+AND\s+/i).filter(p => p.trim())
    }

    // Create tasks for each sub-prompt
    for (const prompt of subPrompts) {
      const targetAgent = targetAgents?.length
        ? targetAgents[tasks.length % targetAgents.length]
        : await this.routePromptToAgent(prompt)

      tasks.push({
        id: randomUUID(),
        prompt: prompt.trim(),
        priority,
        targetAgent,
        timeout: this.config.defaultTimeout,
        retryPolicy: {
          maxRetries: this.config.maxRetries,
          backoffMs: 1000,
          backoffMultiplier: 2,
        },
      })
    }

    // Set up dependencies for sequential patterns
    if (this.detectSequentialPattern(input)) {
      for (let i = 1; i < tasks.length; i++) {
        tasks[i].dependencies = [tasks[i - 1].id]
      }
    }

    return tasks
  }

  /**
   * Route a prompt to the most appropriate agent
   */
  private async routePromptToAgent(prompt: string): Promise<string | undefined> {
    const lowerPrompt = prompt.toLowerCase()

    // Pattern matching for agent routing
    const routingPatterns: Array<{ patterns: RegExp[]; agentId: string }> = [
      {
        patterns: [
          /\bsecurity\b/i,
          /\bvulnerab/i,
          /\battack\b/i,
          /\bexploit\b/i,
          /\bowasp\b/i,
          /\bsecret\b/i,
          /\bpassword\b/i,
          /\bauth\b/i,
        ],
        agentId: 'security',
      },
      {
        patterns: [
          /\bperformance\b/i,
          /\boptimiz/i,
          /\bslow\b/i,
          /\bfast/i,
          /\bmemory\b/i,
          /\bbottleneck\b/i,
          /\bprofile\b/i,
        ],
        agentId: 'performance',
      },
      {
        patterns: [
          /\barchitect/i,
          /\bdesign\b/i,
          /\bpattern\b/i,
          /\bstructure\b/i,
          /\bmodular\b/i,
          /\bscala\b/i,
        ],
        agentId: 'architect',
      },
      {
        patterns: [
          /\bdoc/i,
          /\bcomment\b/i,
          /\breadme\b/i,
          /\bchangelog\b/i,
          /\bapi\s+doc/i,
        ],
        agentId: 'documentation',
      },
      {
        patterns: [
          /\breview\b/i,
          /\bquality\b/i,
          /\bcod(?:e|ing)\s+style\b/i,
          /\brefactor\b/i,
          /\bclean\s+code\b/i,
          /\bbest\s+practice/i,
        ],
        agentId: 'analyst',
      },
    ]

    // Find matching agent
    for (const { patterns, agentId } of routingPatterns) {
      if (patterns.some(p => p.test(prompt)) && this.agents.has(agentId)) {
        return agentId
      }
    }

    // Default to analyst or first available agent
    if (this.agents.has('analyst')) return 'analyst'
    const firstAgent = this.agents.values().next().value
    return firstAgent?.id
  }

  /**
   * Detect if input implies sequential execution
   */
  private detectSequentialPattern(input: string): boolean {
    const sequentialPatterns = [
      /\bthen\b/i,
      /\bafter\s+(that|this)\b/i,
      /\bbased\s+on\s+(that|this|the\s+above)\b/i,
      /\bfirst\b.*\bthen\b/i,
      /\bstep\s+\d+/i,
    ]
    return sequentialPatterns.some(p => p.test(input))
  }

  /**
   * Determine optimal execution strategy based on tasks
   */
  private determineOptimalStrategy(tasks: PromptTask[]): ExecutionStrategy {
    // If any task has dependencies, use hybrid
    if (tasks.some(t => t.dependencies?.length)) {
      return 'hybrid'
    }

    // If few tasks, parallel is efficient
    if (tasks.length <= this.config.maxConcurrency) {
      return 'parallel'
    }

    // For many independent tasks, still use parallel with queue
    return 'parallel'
  }

  // --------------------------------------------------------------------------
  // Plan Execution
  // --------------------------------------------------------------------------

  /**
   * Execute an orchestration plan
   */
  async execute(
    plan: OrchestrationPlan,
    executeTask: (task: PromptTask, agent: Agent) => AsyncGenerator<any, AgentResult>
  ): Promise<AgentResult[]> {
    this.isRunning = true
    const results: AgentResult[] = []
    const completedTasks = new Set<UUID>()

    try {
      switch (plan.executionStrategy) {
        case 'parallel':
          return await this.executeParallel(plan, executeTask, completedTasks)
        case 'sequential':
          return await this.executeSequential(plan, executeTask)
        case 'hybrid':
          return await this.executeHybrid(plan, executeTask, completedTasks)
        default:
          return await this.executeParallel(plan, executeTask, completedTasks)
      }
    } finally {
      this.isRunning = false
      this.emitEvent({ type: 'plan_complete', results })
    }
  }

  /**
   * Execute tasks in parallel
   */
  private async executeParallel(
    plan: OrchestrationPlan,
    executeTask: (task: PromptTask, agent: Agent) => AsyncGenerator<any, AgentResult>,
    completedTasks: Set<UUID>
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = []
    const runningTasks: Map<UUID, Promise<AgentResult>> = new Map()

    for (const task of plan.tasks) {
      // Wait if at concurrency limit
      while (runningTasks.size >= this.config.maxConcurrency) {
        const completed = await Promise.race(runningTasks.values())
        results.push(completed)
      }

      // Start task
      const agent = this.getAgent(task.targetAgent || 'default')
      if (!agent) continue

      const taskPromise = this.executeTaskWithProgress(task, agent, executeTask)
      runningTasks.set(task.id, taskPromise)

      taskPromise.then(result => {
        runningTasks.delete(task.id)
        completedTasks.add(task.id)
      })
    }

    // Wait for remaining tasks
    const remaining = await Promise.all(runningTasks.values())
    results.push(...remaining)

    return results
  }

  /**
   * Execute tasks sequentially
   */
  private async executeSequential(
    plan: OrchestrationPlan,
    executeTask: (task: PromptTask, agent: Agent) => AsyncGenerator<any, AgentResult>
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = []

    for (const task of plan.tasks) {
      const agent = this.getAgent(task.targetAgent || 'default')
      if (!agent) continue

      const result = await this.executeTaskWithProgress(task, agent, executeTask)
      results.push(result)
    }

    return results
  }

  /**
   * Execute with hybrid strategy (respects dependencies)
   */
  private async executeHybrid(
    plan: OrchestrationPlan,
    executeTask: (task: PromptTask, agent: Agent) => AsyncGenerator<any, AgentResult>,
    completedTasks: Set<UUID>
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = []
    const pendingTasks = [...plan.tasks]
    const runningTasks: Map<UUID, Promise<AgentResult>> = new Map()

    while (pendingTasks.length > 0 || runningTasks.size > 0) {
      // Find tasks ready to run (all dependencies met)
      const readyTasks = pendingTasks.filter(task =>
        !task.dependencies?.length ||
        task.dependencies.every(dep => completedTasks.has(dep))
      )

      // Start ready tasks up to concurrency limit
      for (const task of readyTasks) {
        if (runningTasks.size >= this.config.maxConcurrency) break

        const idx = pendingTasks.indexOf(task)
        if (idx > -1) pendingTasks.splice(idx, 1)

        const agent = this.getAgent(task.targetAgent || 'default')
        if (!agent) continue

        const taskPromise = this.executeTaskWithProgress(task, agent, executeTask)
        runningTasks.set(task.id, taskPromise)

        taskPromise.then(result => {
          runningTasks.delete(task.id)
          completedTasks.add(task.id)
          results.push(result)
        })
      }

      // Wait for at least one task to complete
      if (runningTasks.size > 0) {
        await Promise.race(runningTasks.values())
      }
    }

    return results
  }

  /**
   * Execute a single task with progress tracking
   */
  private async executeTaskWithProgress(
    task: PromptTask,
    agent: Agent,
    executeTask: (task: PromptTask, agent: Agent) => AsyncGenerator<any, AgentResult>
  ): Promise<AgentResult> {
    const agentTask: AgentTask = {
      id: task.id,
      agentId: agent.id,
      input: task.prompt,
      status: 'running',
      progress: 0,
      priority: task.priority,
      dependencies: task.dependencies,
      createdAt: Date.now(),
      startedAt: Date.now(),
    }

    this.activeTasks.set(task.id, agentTask)
    this.emitEvent({ type: 'task_started', task: agentTask })

    try {
      const generator = executeTask(task, agent)
      let result: AgentResult | undefined

      for await (const value of generator) {
        if (value.progress !== undefined) {
          agentTask.progress = value.progress
          this.emitEvent({
            type: 'task_progress',
            taskId: task.id,
            progress: value.progress,
            message: value.message,
          })
        }
        result = value
      }

      if (!result) {
        result = { success: false, output: 'No result from agent' }
      }

      agentTask.status = 'complete'
      agentTask.progress = 100
      agentTask.result = result
      agentTask.completedAt = Date.now()

      this.emitEvent({ type: 'task_complete', task: agentTask, result })
      return result
    } catch (error) {
      agentTask.status = 'error'
      agentTask.error = {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        recoverable: true,
      }

      this.emitEvent({ type: 'task_error', task: agentTask, error: agentTask.error })
      throw error
    } finally {
      this.activeTasks.delete(task.id)
    }
  }

  // --------------------------------------------------------------------------
  // Result Aggregation
  // --------------------------------------------------------------------------

  /**
   * Aggregate results from multiple agents
   */
  aggregateResults(
    results: AgentResult[],
    method: AggregationMethod
  ): AgentResult {
    switch (method) {
      case 'merge':
        return this.mergeResults(results)
      case 'vote':
        return this.voteOnResults(results)
      case 'first':
        return results[0] || { success: false, output: 'No results' }
      case 'weighted':
        return this.weightedMerge(results)
      case 'consensus':
        return this.buildConsensus(results)
      default:
        return this.mergeResults(results)
    }
  }

  /**
   * Merge all results together
   */
  private mergeResults(results: AgentResult[]): AgentResult {
    const allFindings = results.flatMap(r => r.findings || [])
    const allRecommendations = results.flatMap(r => r.recommendations || [])
    const allArtifacts = results.flatMap(r => r.artifacts || [])

    // Deduplicate findings by ID
    const uniqueFindings = Array.from(
      new Map(allFindings.map(f => [f.id, f])).values()
    )

    // Deduplicate recommendations by ID
    const uniqueRecommendations = Array.from(
      new Map(allRecommendations.map(r => [r.id, r])).values()
    )

    // Combine outputs
    const combinedOutput = results
      .filter(r => r.success)
      .map(r => r.output)
      .join('\n\n---\n\n')

    return {
      success: results.some(r => r.success),
      output: combinedOutput || 'No output from agents',
      findings: uniqueFindings,
      recommendations: uniqueRecommendations,
      artifacts: allArtifacts,
      metrics: this.aggregateMetrics(results),
    }
  }

  /**
   * Vote on conflicting recommendations
   */
  private voteOnResults(results: AgentResult[]): AgentResult {
    const merged = this.mergeResults(results)
    // For now, just use merge - voting logic can be enhanced
    return merged
  }

  /**
   * Weighted merge based on agent confidence
   */
  private weightedMerge(results: AgentResult[]): AgentResult {
    // For now, use simple merge - can add weighting logic
    return this.mergeResults(results)
  }

  /**
   * Build consensus from multiple agents
   */
  private buildConsensus(results: AgentResult[]): AgentResult {
    const merged = this.mergeResults(results)

    // Find recommendations that appear in multiple results
    const recommendationCounts = new Map<string, number>()
    for (const result of results) {
      for (const rec of result.recommendations || []) {
        const count = recommendationCounts.get(rec.id) || 0
        recommendationCounts.set(rec.id, count + 1)
      }
    }

    // Filter to recommendations with consensus (>50% agreement)
    const consensusThreshold = Math.ceil(results.length / 2)
    const consensusRecommendations = merged.recommendations?.filter(
      rec => (recommendationCounts.get(rec.id) || 0) >= consensusThreshold
    )

    return {
      ...merged,
      recommendations: consensusRecommendations,
    }
  }

  /**
   * Aggregate metrics from all tasks
   */
  private aggregateMetrics(results: AgentResult[]): { durationMs: number; tokensUsed: number; toolCalls: number; retries: number } {
    return {
      durationMs: results.reduce((sum, r) => sum + (r.metrics?.durationMs || 0), 0),
      tokensUsed: results.reduce((sum, r) => sum + (r.metrics?.tokensUsed || 0), 0),
      toolCalls: results.reduce((sum, r) => sum + (r.metrics?.toolCalls || 0), 0),
      retries: results.reduce((sum, r) => sum + (r.metrics?.retries || 0), 0),
    }
  }

  // --------------------------------------------------------------------------
  // Event System
  // --------------------------------------------------------------------------

  /**
   * Add an event listener
   */
  onEvent(listener: OrchestrationEventListener): void {
    this.eventListeners.add(listener)
  }

  /**
   * Remove an event listener
   */
  offEvent(listener: OrchestrationEventListener): void {
    this.eventListeners.delete(listener)
  }

  /**
   * Emit an orchestration event
   */
  private emitEvent(event: OrchestrationEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in orchestration event listener:', error)
      }
    }
    this.emit(event.type, event)
  }

  // --------------------------------------------------------------------------
  // Checkpointing
  // --------------------------------------------------------------------------

  /**
   * Create a checkpoint for resumable execution
   */
  createCheckpoint(taskId: UUID, state: unknown): Checkpoint {
    const checkpoint: Checkpoint = {
      id: randomUUID(),
      taskId,
      state,
      createdAt: Date.now(),
    }

    this.checkpoints.set(checkpoint.id, checkpoint)
    this.emitEvent({ type: 'checkpoint_created', checkpoint })
    return checkpoint
  }

  /**
   * Restore from a checkpoint
   */
  getCheckpoint(checkpointId: UUID): Checkpoint | undefined {
    return this.checkpoints.get(checkpointId)
  }

  /**
   * Get latest checkpoint for a task
   */
  getLatestCheckpoint(taskId: UUID): Checkpoint | undefined {
    const taskCheckpoints = Array.from(this.checkpoints.values())
      .filter(cp => cp.taskId === taskId)
      .sort((a, b) => b.createdAt - a.createdAt)
    return taskCheckpoints[0]
  }

  // --------------------------------------------------------------------------
  // Status & Metrics
  // --------------------------------------------------------------------------

  /**
   * Get current orchestrator status
   */
  getStatus(): {
    isRunning: boolean
    activeTasks: number
    queuedTasks: number
    registeredAgents: number
  } {
    return {
      isRunning: this.isRunning,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      registeredAgents: this.agents.size,
    }
  }

  /**
   * Get active tasks
   */
  getActiveTasks(): AgentTask[] {
    return Array.from(this.activeTasks.values())
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let orchestratorInstance: MultiPromptOrchestrator | null = null

export function getOrchestrator(
  config?: Partial<OrchestratorConfig>
): MultiPromptOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new MultiPromptOrchestrator(config)
  }
  return orchestratorInstance
}

export function resetOrchestrator(): void {
  orchestratorInstance = null
}
