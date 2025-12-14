/**
 * Multi-Agent Visualization Component
 * 
 * Real-time visualization of multi-agent orchestration with progress bars,
 * status indicators, and agent collaboration display.
 */

import { Box, Text } from 'ink'
import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import { getTheme } from '../utils/theme'
import { AgentTask, OrchestrationEvent } from '../types/agents'
import { getIcons } from '../utils/fonts'

// ============================================================================
// Types
// ============================================================================

interface AgentVisualizationProps {
  tasks: AgentTask[]
  onEvent?: (event: OrchestrationEvent) => void
  showDetails?: boolean
  compact?: boolean
}

interface AgentCardProps {
  task: AgentTask
  compact?: boolean
}

// ============================================================================
// Agent Icons and Colors
// ============================================================================

const AGENT_CONFIG: Record<string, { icon: string; color: string; name: string }> = {
  security: { icon: '🔒', color: '#ff6b6b', name: 'Security' },
  performance: { icon: '⚡', color: '#ffd93d', name: 'Performance' },
  architect: { icon: '🏗️', color: '#6bcb77', name: 'Architect' },
  analyst: { icon: '🔍', color: '#4d96ff', name: 'Analyst' },
  documentation: { icon: '📝', color: '#9d65c9', name: 'Documentation' },
  default: { icon: '🤖', color: '#888888', name: 'Agent' },
}

function getAgentConfig(agentId: string) {
  return AGENT_CONFIG[agentId] || AGENT_CONFIG.default
}

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  progress: number
  width?: number
  color?: string
  showPercentage?: boolean
}

function ProgressBar({ progress, width = 20, color, showPercentage = true }: ProgressBarProps): React.ReactNode {
  const theme = getTheme()
  const barColor = color || theme.cynerza

  // Calculate filled and empty portions
  const filledWidth = Math.round((progress / 100) * width)
  const emptyWidth = width - filledWidth

  // Create gradient effect for filled portion
  const filledChars = '█'.repeat(filledWidth)
  const emptyChars = '░'.repeat(emptyWidth)

  return (
    <Box>
      <Text color={barColor}>{filledChars}</Text>
      <Text color={theme.secondaryText}>{emptyChars}</Text>
      {showPercentage && (
        <Text color={theme.secondaryText}> {progress}%</Text>
      )}
    </Box>
  )
}

// ============================================================================
// Agent Card Component
// ============================================================================

function AgentCard({ task, compact = false }: AgentCardProps): React.ReactNode {
  const theme = getTheme()
  const config = getAgentConfig(task.agentId)
  const icons = getIcons()

  const getStatusIcon = () => {
    switch (task.status) {
      case 'running': return '●'
      case 'complete': return icons.success
      case 'error': return icons.error
      case 'pending': return '○'
      case 'queued': return '◐'
      default: return '·'
    }
  }

  const getStatusColor = () => {
    switch (task.status) {
      case 'running': return config.color
      case 'complete': return '#6bcb77'
      case 'error': return '#ff6b6b'
      case 'pending': return theme.secondaryText
      case 'queued': return theme.secondaryText
      default: return theme.secondaryText
    }
  }

  if (compact) {
    return (
      <Box flexDirection="row" gap={1}>
        <Text color={config.color}>{config.icon}</Text>
        <Text color={getStatusColor()}>{getStatusIcon()}</Text>
        <Text color={theme.text}>{config.name}</Text>
        {task.status === 'running' && (
          <Text color={theme.secondaryText}>{task.progress}%</Text>
        )}
      </Box>
    )
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={config.color}
      paddingX={1}
      width={24}
    >
      {/* Header */}
      <Box flexDirection="row" gap={1}>
        <Text color={config.color}>{config.icon}</Text>
        <Text color={theme.text} bold>{config.name}</Text>
      </Box>

      {/* Progress Bar */}
      <ProgressBar 
        progress={task.progress} 
        width={18} 
        color={config.color}
        showPercentage={false}
      />

      {/* Status */}
      <Box flexDirection="row" gap={1}>
        <Text color={getStatusColor()}>{getStatusIcon()}</Text>
        <Text color={theme.secondaryText}>
          {task.status === 'complete' ? 'Done' : 
           task.status === 'running' ? `${task.progress}%` :
           task.status === 'error' ? 'Error' :
           'Waiting'}
        </Text>
      </Box>

      {/* Result preview if complete */}
      {task.status === 'complete' && task.result && (
        <Text color={theme.secondaryText} wrap="truncate">
          {task.result.findings?.length || 0} findings
        </Text>
      )}
    </Box>
  )
}

// ============================================================================
// Main Visualization Component
// ============================================================================

export function MultiAgentVisualization({ 
  tasks, 
  showDetails = true,
  compact = false,
}: AgentVisualizationProps): React.ReactNode {
  const theme = getTheme()
  const [elapsedTime, setElapsedTime] = useState(0)
  const startTime = useRef(Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.current) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Calculate stats
  const activeTasks = tasks.filter(t => t.status === 'running').length
  const completedTasks = tasks.filter(t => t.status === 'complete').length
  const totalProgress = tasks.length ? 
    Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length) : 0
  const totalTokens = tasks.reduce((sum, t) => 
    sum + (t.result?.metrics?.tokensUsed || 0), 0
  )

  if (compact) {
    return (
      <Box flexDirection="column" marginY={1}>
        <Box flexDirection="row" gap={2}>
          <Text color={theme.cynerza} bold>🧠 Multi-Agent</Text>
          <Text color={theme.secondaryText}>
            {activeTasks} active · {completedTasks}/{tasks.length} done
          </Text>
        </Box>
        <Box flexDirection="row" gap={2} flexWrap="wrap">
          {tasks.map(task => (
            <AgentCard key={task.id} task={task} compact />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.cynerza}
      paddingX={2}
      paddingY={1}
      marginY={1}
    >
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text color={theme.cynerza} bold>
          🧠 Cyne Multi-Agent Analysis
        </Text>
        <Text color={theme.secondaryText}>
          {totalProgress}% Complete
        </Text>
      </Box>

      {/* Agent Cards Grid */}
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        {tasks.map(task => (
          <AgentCard key={task.id} task={task} />
        ))}
      </Box>

      {/* Footer Stats */}
      <Box 
        flexDirection="row" 
        justifyContent="space-between" 
        marginTop={1}
        borderStyle="single"
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        paddingTop={1}
      >
        <Text color={theme.secondaryText}>
          ⏱ {elapsedTime}s
        </Text>
        <Text color={theme.secondaryText}>
          {activeTasks} agents active
        </Text>
        {totalTokens > 0 && (
          <Text color={theme.secondaryText}>
            {totalTokens.toLocaleString()} tokens
          </Text>
        )}
        <Text color={theme.secondaryText}>
          <Text color={theme.cynerza} bold>esc</Text> to interrupt
        </Text>
      </Box>
    </Box>
  )
}

// ============================================================================
// Simple Agent Status Line
// ============================================================================

interface AgentStatusLineProps {
  agentId: string
  status: string
  progress: number
  message?: string
}

export function AgentStatusLine({ 
  agentId, 
  status, 
  progress, 
  message 
}: AgentStatusLineProps): React.ReactNode {
  const theme = getTheme()
  const config = getAgentConfig(agentId)

  return (
    <Box flexDirection="row" gap={1}>
      <Text color={config.color}>{config.icon}</Text>
      <Text color={theme.text}>{config.name}</Text>
      <ProgressBar progress={progress} width={15} color={config.color} />
      {message && (
        <Text color={theme.secondaryText}>{message}</Text>
      )}
    </Box>
  )
}

// ============================================================================
// Orchestration Summary
// ============================================================================

interface OrchestrationSummaryProps {
  totalAgents: number
  completedAgents: number
  totalFindings: number
  recommendations: number
  duration: number
}

export function OrchestrationSummary({
  totalAgents,
  completedAgents,
  totalFindings,
  recommendations,
  duration,
}: OrchestrationSummaryProps): React.ReactNode {
  const theme = getTheme()

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.cynerza}
      paddingX={2}
      paddingY={1}
      marginY={1}
    >
      <Text color={theme.cynerza} bold>
        ✨ Analysis Complete
      </Text>
      
      <Box flexDirection="row" gap={3} marginTop={1}>
        <Box flexDirection="column">
          <Text color={theme.secondaryText}>Agents</Text>
          <Text color={theme.text} bold>{completedAgents}/{totalAgents}</Text>
        </Box>
        
        <Box flexDirection="column">
          <Text color={theme.secondaryText}>Findings</Text>
          <Text color={theme.text} bold>{totalFindings}</Text>
        </Box>
        
        <Box flexDirection="column">
          <Text color={theme.secondaryText}>Recommendations</Text>
          <Text color={theme.text} bold>{recommendations}</Text>
        </Box>
        
        <Box flexDirection="column">
          <Text color={theme.secondaryText}>Duration</Text>
          <Text color={theme.text} bold>{(duration / 1000).toFixed(1)}s</Text>
        </Box>
      </Box>
    </Box>
  )
}
