/**
 * Multi-Prompt Tool - Complete Multi-Agent Orchestration
 * 
 * This tool provides comprehensive multi-agent analysis by orchestrating
 * specialized agents (Security, Performance, Architect, Analyst, Documentation)
 * to provide holistic codebase analysis with beautiful UI visualization.
 */

import { Box, Text } from 'ink'
import React from 'react'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { Tool, ValidationResult } from '../../Tool'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import { getTheme } from '../../utils/theme'
import { setSessionState, getSessionState } from '../../utils/sessionState'
import { 
  agentRegistry, 
  securityAgent,
  performanceAgent,
  architectAgent,
  codeAnalystAgent,
  documentationAgent,
} from '../../agents'
import { BaseAgent } from '../../agents/BaseAgent'
import { AgentResult, Finding, Recommendation } from '../../types/agents'

// ============================================================================
// Tool Schema
// ============================================================================

const inputSchema = z.strictObject({
  prompt: z
    .string()
    .describe('The analysis request to process with multiple agents'),
  agents: z
    .array(z.string())
    .optional()
    .describe('Specific agents: security, performance, architect, analyst, documentation'),
  strategy: z
    .enum(['parallel', 'sequential', 'hybrid'])
    .optional()
    .describe('Execution strategy'),
  aggregation: z
    .enum(['merge', 'vote', 'consensus'])
    .optional()
    .describe('Result aggregation method'),
})

type Input = typeof inputSchema
type Output = {
  success: boolean
  output: string
  agentsUsed: string[]
  duration: number
  findings: Finding[]
  recommendations: Recommendation[]
}

// ============================================================================
// Agent Status for UI
// ============================================================================

interface AgentStatus {
  id: string
  agentId: string
  progress: number
  status: 'pending' | 'running' | 'complete' | 'error'
}

// Update session state for Spinner UI
function updateAgentStatuses(statuses: AgentStatus[]) {
  setSessionState('activeAgents', statuses)
}

function clearAgentStatuses() {
  setSessionState('activeAgents', [])
}

// ============================================================================
// Agent Execution
// ============================================================================

async function executeAgentAnalysis(
  agent: BaseAgent,
  prompt: string,
  statuses: AgentStatus[],
  statusIndex: number,
  abortController?: AbortController
): Promise<AgentResult> {
  const status = statuses[statusIndex]
  status.status = 'running'
  updateAgentStatuses([...statuses])

  try {
    const generator = agent.execute(prompt, undefined, abortController)
    let result: AgentResult = { success: false, output: '' }

    for await (const value of generator) {
      if (typeof value === 'object' && 'progress' in value) {
        status.progress = value.progress
        updateAgentStatuses([...statuses])
      }
      result = value as any
    }

    status.status = 'complete'
    status.progress = 100
    updateAgentStatuses([...statuses])

    return result
  } catch (error) {
    status.status = 'error'
    updateAgentStatuses([...statuses])
    
    return {
      success: false,
      output: error instanceof Error ? error.message : String(error),
    }
  }
}

async function runMultiAgentAnalysis(
  prompt: string,
  agents: BaseAgent[],
  strategy: 'parallel' | 'sequential' | 'hybrid',
  abortController?: AbortController
): Promise<{ results: AgentResult[]; statuses: AgentStatus[] }> {
  // Initialize statuses
  const statuses: AgentStatus[] = agents.map((agent, i) => ({
    id: `agent-${i}`,
    agentId: agent.id,
    progress: 0,
    status: 'pending' as const,
  }))
  updateAgentStatuses(statuses)

  const results: AgentResult[] = []

  if (strategy === 'sequential') {
    // Execute one by one
    for (let i = 0; i < agents.length; i++) {
      const result = await executeAgentAnalysis(
        agents[i],
        prompt,
        statuses,
        i,
        abortController
      )
      results.push(result)
    }
  } else {
    // Parallel execution
    const promises = agents.map((agent, i) =>
      executeAgentAnalysis(agent, prompt, statuses, i, abortController)
    )
    const parallelResults = await Promise.allSettled(promises)
    
    for (const result of parallelResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        results.push({ success: false, output: result.reason?.message || 'Error' })
      }
    }
  }

  return { results, statuses }
}

// ============================================================================
// Result Aggregation
// ============================================================================

function aggregateResults(
  results: AgentResult[],
  agents: BaseAgent[],
  aggregation: string
): { output: string; findings: Finding[]; recommendations: Recommendation[] } {
  const allFindings: Finding[] = []
  const allRecommendations: Recommendation[] = []
  const sections: string[] = []

  sections.push(`# 🧠 Multi-Agent Analysis Report\n`)

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const agent = agents[i]
    const status = result.success ? '✅' : '❌'

    sections.push(`## ${status} ${agent.name}\n`)
    
    if (result.output) {
      sections.push(result.output.slice(0, 2000))
      if (result.output.length > 2000) {
        sections.push('\n*... (truncated)*')
      }
    }
    sections.push('')

    // Collect findings
    if (result.findings?.length) {
      allFindings.push(...result.findings)
    }

    // Collect recommendations  
    if (result.recommendations?.length) {
      allRecommendations.push(...result.recommendations)
    }
  }

  // Summary section
  if (allFindings.length > 0) {
    sections.push(`## 🔍 Findings Summary (${allFindings.length} total)\n`)
    
    const bySeverity: Record<string, Finding[]> = {}
    for (const f of allFindings) {
      const sev = f.severity || 'info'
      if (!bySeverity[sev]) bySeverity[sev] = []
      bySeverity[sev].push(f)
    }

    for (const severity of ['critical', 'high', 'medium', 'low', 'info']) {
      const findings = bySeverity[severity]
      if (findings?.length) {
        const icon = severity === 'critical' ? '🔴' :
                     severity === 'high' ? '🟠' :
                     severity === 'medium' ? '🟡' :
                     severity === 'low' ? '🔵' : 'ℹ️'
        sections.push(`### ${icon} ${severity.toUpperCase()} (${findings.length})`)
        for (const f of findings.slice(0, 5)) {
          sections.push(`- **${f.title}**`)
          if (f.location) {
            sections.push(`  - ${f.location.file}:${f.location.startLine}`)
          }
        }
        if (findings.length > 5) {
          sections.push(`  - *... and ${findings.length - 5} more*`)
        }
        sections.push('')
      }
    }
  }

  if (allRecommendations.length > 0) {
    sections.push(`## 💡 Recommendations (${allRecommendations.length} total)\n`)
    for (const rec of allRecommendations.slice(0, 10)) {
      sections.push(`- **${rec.title}**`)
      sections.push(`  ${rec.description.slice(0, 200)}`)
    }
    if (allRecommendations.length > 10) {
      sections.push(`\n*... and ${allRecommendations.length - 10} more recommendations*`)
    }
  }

  return {
    output: sections.join('\n'),
    findings: allFindings,
    recommendations: allRecommendations,
  }
}

// ============================================================================
// Tool Implementation
// ============================================================================

export const MultiPromptTool = {
  name: 'multi_agent_analysis',
  
  async description() {
    return `Orchestrate multi-agent analysis using specialized agents.
Available agents: security, performance, architect, analyst, documentation.
Use for comprehensive code analysis that benefits from multiple expert perspectives.

Each agent uses AI and available tools to analyze the codebase from its specialty.
Results are aggregated and presented with findings and recommendations.`
  },
  
  inputSchema,
  
  isReadOnly() {
    return true
  },
  
  async isEnabled() {
    return true
  },
  
  userFacingName() {
    return 'Multi-Agent Analysis'
  },
  
  needsPermissions() {
    return false
  },
  
  async prompt() {
    return `## Multi-Agent Analysis Tool

Orchestrates multiple specialized agents for comprehensive code analysis.
Each agent runs a full AI analysis using available tools.

### Available Agents
- **security**: Vulnerability scanning, secrets detection, OWASP checks
- **performance**: Bottleneck detection, memory analysis, optimization
- **architect**: Design patterns, structure review, modularity
- **analyst**: Code quality, best practices, refactoring
- **documentation**: Docs review, comments, README quality

### When to Use
- User asks for "comprehensive analysis", "full review", or "multi-agent"
- Multiple security AND performance concerns
- Complex refactoring needs multiple perspectives

### Example
{
  "prompt": "Analyze security vulnerabilities in this codebase",
  "agents": ["security", "analyst"],
  "strategy": "parallel"
}`
  },
  
  async validateInput({ prompt }: { prompt?: string }): Promise<ValidationResult> {
    if (!prompt) {
      return { result: false, message: 'Prompt is required' }
    }
    return { result: true, message: 'Valid input' }
  },
  
  renderToolUseMessage(
    { prompt, agents }: { prompt?: string; agents?: string[] }, 
    { verbose }: { verbose: boolean }
  ) {
    const promptText = prompt || ''
    const agentList = agents?.join(', ') || 'auto'
    return `🧠 Multi-Agent [${agentList}]: "${promptText.slice(0, 50)}${promptText.length > 50 ? '...' : ''}"`
  },
  
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  
  renderToolResultMessage(output: Output) {
    const theme = getTheme()
    
    if (typeof output === 'string') {
      return (
        <Box flexDirection="row">
          <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
          <Text color={theme.cynerza}>Analysis complete</Text>
        </Box>
      )
    }
    
    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
          <Text color={theme.cynerza} bold>
            ✨ Multi-Agent Analysis Complete
          </Text>
        </Box>
        <Box flexDirection="row" marginLeft={5} gap={2}>
          <Text color={theme.secondaryText}>
            {output.agentsUsed?.length || 0} agents
          </Text>
          <Text color={theme.secondaryText}>
            {output.findings?.length || 0} findings
          </Text>
          <Text color={theme.secondaryText}>
            {output.recommendations?.length || 0} recommendations
          </Text>
          <Text color={theme.secondaryText}>
            {((output.duration || 0) / 1000).toFixed(1)}s
          </Text>
        </Box>
      </Box>
    )
  },
  
  renderResultForAssistant(output: Output) {
    if (!output) return 'Multi-agent analysis complete'
    return output.output || 'Analysis complete'
  },
  
  async *call(
    { prompt, agents, strategy, aggregation }: { 
      prompt?: string; 
      agents?: string[]; 
      strategy?: string; 
      aggregation?: string 
    },
    { abortController }: { abortController: AbortController }
  ) {
    const promptText = prompt || ''
    const execStrategy = (strategy as 'parallel' | 'sequential' | 'hybrid') || 'parallel'
    const aggMethod = aggregation || 'merge'
    
    const startTime = Date.now()

    // Determine which agents to use
    const agentsToUse: BaseAgent[] = []
    
    if (agents && agents.length > 0) {
      // Use specified agents
      for (const id of agents) {
        const agent = agentRegistry.get(id)
        if (agent) agentsToUse.push(agent)
      }
    } else {
      // Auto-detect based on prompt
      const lower = promptText.toLowerCase()
      
      if (/security|vulnerab|secret|password|auth|owasp/i.test(lower)) {
        if (securityAgent) agentsToUse.push(securityAgent)
      }
      if (/performance|optim|slow|fast|memory|bottleneck/i.test(lower)) {
        if (performanceAgent) agentsToUse.push(performanceAgent)
      }
      if (/architect|design|pattern|structure|modular/i.test(lower)) {
        if (architectAgent) agentsToUse.push(architectAgent)
      }
      if (/review|quality|refactor|clean|best practice|analyst/i.test(lower)) {
        if (codeAnalystAgent) agentsToUse.push(codeAnalystAgent)
      }
      if (/doc|comment|readme/i.test(lower)) {
        if (documentationAgent) agentsToUse.push(documentationAgent)
      }
      
      // Default: security + analyst
      if (agentsToUse.length === 0) {
        if (securityAgent) agentsToUse.push(securityAgent)
        if (codeAnalystAgent) agentsToUse.push(codeAnalystAgent)
      }
    }

    if (agentsToUse.length === 0) {
      yield {
        type: 'result',
        resultForAssistant: 'No agents available for multi-agent analysis.',
        data: {
          success: false,
          output: 'No agents available',
          agentsUsed: [],
          duration: 0,
          findings: [],
          recommendations: [],
        },
      }
      return
    }

    // Run multi-agent analysis
    try {
      const { results } = await runMultiAgentAnalysis(
        promptText,
        agentsToUse,
        execStrategy,
        abortController
      )

      // Aggregate results
      const { output, findings, recommendations } = aggregateResults(
        results,
        agentsToUse,
        aggMethod
      )

      const duration = Date.now() - startTime

      // Clear UI state
      clearAgentStatuses()

      const result: Output = {
        success: results.some(r => r.success),
        output,
        agentsUsed: agentsToUse.map(a => a.id),
        duration,
        findings,
        recommendations,
      }

      yield {
        type: 'result',
        resultForAssistant: this.renderResultForAssistant(result),
        data: result,
      }
    } catch (error) {
      clearAgentStatuses()
      
      yield {
        type: 'result',
        resultForAssistant: `Multi-agent analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        data: {
          success: false,
          output: `Error: ${error instanceof Error ? error.message : String(error)}`,
          agentsUsed: agentsToUse.map(a => a.id),
          duration: Date.now() - startTime,
          findings: [],
          recommendations: [],
        },
      }
    }
  },
} satisfies Tool<Input, Output>
