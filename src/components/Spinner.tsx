import { Box, Text } from 'ink'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { getTheme } from '../utils/theme'
import { sample } from 'lodash-es'
import { getSessionState } from '../utils/sessionState'

/**
 * Enhanced Spinner with Multi-Agent Visualization Support
 * Shows animated spinner and optionally multi-agent progress when active
 */

// Agent configuration for multi-agent display
const AGENT_ICONS: Record<string, { icon: string; color: string; name: string }> = {
  security: { icon: '🔒', color: '#ff6b6b', name: 'Security' },
  performance: { icon: '⚡', color: '#ffd93d', name: 'Performance' },
  architect: { icon: '🏗️', color: '#6bcb77', name: 'Architect' },
  analyst: { icon: '🔍', color: '#4d96ff', name: 'Analyst' },
  documentation: { icon: '📝', color: '#9d65c9', name: 'Docs' },
  default: { icon: '🤖', color: '#888888', name: 'Agent' },
}

// Context-specific spinner patterns
const SPINNER_PATTERNS = {
  // Default thinking spinner
  default: { frames: ['◐', '◓', '◑', '◒'], interval: 120 },
  
  // Tool execution spinners
  triangles: { frames: ['◢', '◣', '◤', '◥'], interval: 120 },
  clock: { frames: ['◴', '◷', '◶', '◵'], interval: 120 },
  bounce: { frames: ['⠁', '⠂', '⠄', '⠂'], interval: 120 },
  boxBounce: { frames: ['▖', '▘', '▝', '▗'], interval: 120 },
  boxBounce2: { frames: ['▌', '▀', '▐', '▄'], interval: 100 },
  noise: { frames: ['▓', '▒', '░'], interval: 100 },
  toggle: { frames: ['⦾', '⦿'], interval: 80 },
  arrows: { frames: ['⊶', '⊷'], interval: 250 },
  bouncingBall: { 
    frames: ['( ●    )', '(  ●   )', '(   ●  )', '(    ● )', '(     ●)', '(    ● )', '(   ●  )', '(  ●   )', '( ●    )', '(●     )'],
    interval: 80 
  },
}

// Pick a random tool spinner
const TOOL_SPINNERS = ['triangles', 'clock', 'bounce', 'boxBounce', 'boxBounce2', 'noise', 'toggle', 'arrows'] as const
type SpinnerType = keyof typeof SPINNER_PATTERNS

// Subtle gradient - just 2-3 colors, not too colorful
const CYNE_GRADIENT_COLORS = ['#9ACD32', '#7CBA1D', '#9ACD32'] // Green pulse

// Keep variety of processing messages
const CYNER_PROCESSING_MESSAGES = [
  'Analyzing',
  'Synthesizing',
  'Processing',
  'Thinking',
  'Evaluating',
  'Building',
  'Computing',
  'Inferring',
]

const MULTI_AGENT_MESSAGES = [
  'Multi-Agent Analysis',
  'Coordinating Agents',
  'Parallel Processing',
  'Synthesizing Insights',
  'Consensus Building',
]

interface AgentStatus {
  id: string
  agentId: string
  progress: number
  status: 'pending' | 'running' | 'complete' | 'error'
}

// Get all spinner pattern keys
const ALL_SPINNER_KEYS = Object.keys(SPINNER_PATTERNS) as SpinnerType[]

class CynerSpinnerStateManager {
  private patternFrame: number = 0
  private colorFrame: number = 0
  private elapsedTime: number = 0
  private startTime: number = Date.now()
  private message: string
  private spinnerType: SpinnerType
  private currentPattern: { frames: string[], interval: number }

  constructor(isMultiAgent: boolean = false) {
    this.message = isMultiAgent 
      ? sample(MULTI_AGENT_MESSAGES) || 'Multi-Agent Analysis'
      : sample(CYNER_PROCESSING_MESSAGES) || 'Processing'
    // Randomly pick a spinner type
    this.spinnerType = sample(ALL_SPINNER_KEYS) || 'default'
    this.currentPattern = SPINNER_PATTERNS[this.spinnerType]
  }

  getPatternFrame(): number {
    return this.patternFrame
  }

  incrementPatternFrame(): void {
    this.patternFrame = (this.patternFrame + 1) % this.currentPattern.frames.length
    this.colorFrame = (this.colorFrame + 1) % CYNE_GRADIENT_COLORS.length
  }

  getCurrentFrame(): string {
    return this.currentPattern.frames[this.patternFrame]
  }

  getInterval(): number {
    return this.currentPattern.interval
  }

  getCurrentColor(): string {
    return CYNE_GRADIENT_COLORS[this.colorFrame]
  }

  getMessage(): string {
    return this.message
  }

  updateElapsedTime(): void {
    this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000)
  }

  getElapsedTime(): number {
    return this.elapsedTime
  }
}

/**
 * Agent Progress Bar Component
 */
function AgentProgressBar({ 
  agentId, 
  progress, 
  status 
}: AgentStatus): React.ReactNode {
  const theme = getTheme()
  const config = AGENT_ICONS[agentId] || AGENT_ICONS.default
  
  const width = 10
  const filled = Math.round((progress / 100) * width)
  const empty = width - filled
  
  const statusIcon = status === 'complete' ? '✓' :
                     status === 'error' ? '✗' :
                     status === 'running' ? '●' : '○'
  
  const statusColor = status === 'complete' ? '#6bcb77' :
                      status === 'error' ? '#ff6b6b' :
                      status === 'running' ? config.color : theme.secondaryText

  return (
    <Box flexDirection="row" gap={1}>
      <Text color={config.color}>{config.icon}</Text>
      <Text color={theme.text}>{config.name.padEnd(6)}</Text>
      <Text color={statusColor}>{statusIcon}</Text>
      <Text color={config.color}>{'█'.repeat(filled)}</Text>
      <Text color={theme.secondaryText}>{'░'.repeat(empty)}</Text>
      <Text color={theme.secondaryText}>{progress.toString().padStart(3)}%</Text>
    </Box>
  )
}

/**
 * Enhanced Spinner Component with Multi-Agent Support
 */
export function Spinner(): React.ReactNode {
  const theme = getTheme()
  
  // Check for multi-agent activity
  const [activeAgents, setActiveAgents] = useState<AgentStatus[]>([])
  const isMultiAgent = activeAgents.length > 0
  
  const [stateManager] = useState(() => new CynerSpinnerStateManager(isMultiAgent))
  const [patternFrame, setPatternFrame] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [tokenCount, setTokenCount] = useState(0)
  const message = useRef(stateManager.getMessage())
  const startTime = useRef(Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setPatternFrame(pf => (pf + 1) % SPINNER_PATTERNS.default.frames.length)
      stateManager.incrementPatternFrame()
      
      // Refresh token count and agent status from session state
      setTokenCount(getSessionState('streamingTokens') || 0)
      
      // Check for active agents
      const agents = getSessionState('activeAgents') as AgentStatus[] | undefined
      if (agents && agents.length > 0) {
        setActiveAgents(agents)
      }
    }, 200)

    return () => clearInterval(timer)
  }, [stateManager])

  useEffect(() => {
    const timer = setInterval(() => {
      const newElapsedTime = Math.floor((Date.now() - startTime.current) / 1000)
      setElapsedTime(newElapsedTime)
      stateManager.updateElapsedTime()
    }, 1000)

    return () => clearInterval(timer)
  }, [stateManager])

  // Multi-Agent Visualization
  if (isMultiAgent) {
    const completedAgents = activeAgents.filter(a => a.status === 'complete').length
    const totalProgress = Math.round(
      activeAgents.reduce((sum, a) => sum + a.progress, 0) / activeAgents.length
    )
    const currentColor = CYNE_GRADIENT_COLORS[patternFrame % CYNE_GRADIENT_COLORS.length]

    return (
      <Box flexDirection="column" marginTop={1}>
        {/* Header */}
        <Box flexDirection="row" gap={2}>
          <Text color={currentColor} bold>
            {SPINNER_PATTERNS.default.frames[patternFrame % SPINNER_PATTERNS.default.frames.length]}
          </Text>
          <Text color={currentColor} bold>
            Multi-Agent Analysis
          </Text>
          <Text color={theme.secondaryText}>
            {completedAgents}/{activeAgents.length} complete · {totalProgress}%
          </Text>
        </Box>

        {/* Agent Progress Bars */}
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          {activeAgents.map(agent => (
            <AgentProgressBar
              key={agent.id}
              id={agent.id}
              agentId={agent.agentId || agent.id}
              progress={agent.progress}
              status={agent.status}
            />
          ))}
        </Box>

        {/* Footer */}
        <Box flexDirection="row" marginTop={1} gap={2}>
          <Text color={theme.secondaryText}>
            ({elapsedTime}s · <Text bold color={currentColor}>esc</Text> to interrupt)
          </Text>
          {tokenCount > 0 && (
            <Text color={currentColor}>· {tokenCount} tokens</Text>
          )}
        </Box>
      </Box>
    )
  }

  // Standard Spinner with subtle gradient - uses random spinner from stateManager
  const currentColor = stateManager.getCurrentColor()
  const spinnerIcon = stateManager.getCurrentFrame()
  
  return (
    <Box flexDirection="row" marginTop={1}>
      <Text color={currentColor} bold>
        {spinnerIcon}{' '}
      </Text>
      <Text color={currentColor} bold>{message.current}… </Text>
      <Text color={theme.secondaryText}>
        ({elapsedTime}s · <Text bold color={currentColor}>esc</Text> to interrupt)
      </Text>
      {tokenCount > 0 && (
        <Text color={currentColor}> · {tokenCount} tokens</Text>
      )}
    </Box>
  )
}

/**
 * Simple Spinner Component
 */
export function SimpleSpinner(): React.ReactNode {
  const [patternFrame, setPatternFrame] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setPatternFrame(pf => (pf + 1) % SPINNER_PATTERNS.default.frames.length)
    }, 200)

    return () => clearInterval(timer)
  }, [])

  const currentColor = CYNE_GRADIENT_COLORS[patternFrame % CYNE_GRADIENT_COLORS.length]

  return (
    <Text color={currentColor} bold>
      {SPINNER_PATTERNS.default.frames[patternFrame % SPINNER_PATTERNS.default.frames.length]}
    </Text>
  )
}

/**
 * Multi-Agent Spinner - Explicit multi-agent visualization
 */
interface MultiAgentSpinnerProps {
  agents: AgentStatus[]
  title?: string
}

export function MultiAgentSpinner({ 
  agents, 
  title = 'Multi-Agent Analysis' 
}: MultiAgentSpinnerProps): React.ReactNode {
  const theme = getTheme()
  const [patternFrame, setPatternFrame] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const startTime = useRef(Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setPatternFrame(pf => (pf + 1) % SPINNER_PATTERNS.default.frames.length)
    }, 200)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.current) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const completedAgents = agents.filter(a => a.status === 'complete').length
  const totalProgress = agents.length > 0 
    ? Math.round(agents.reduce((sum, a) => sum + a.progress, 0) / agents.length)
    : 0

  const currentColor = CYNE_GRADIENT_COLORS[patternFrame % CYNE_GRADIENT_COLORS.length]

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={currentColor}
      paddingX={2}
      paddingY={1}
      marginY={1}
    >
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexDirection="row" gap={1}>
          <Text color={currentColor} bold>
            {SPINNER_PATTERNS.default.frames[patternFrame % SPINNER_PATTERNS.default.frames.length]}
          </Text>
          <Text color={currentColor} bold>
            {title}
          </Text>
        </Box>
        <Text color={theme.secondaryText}>
          {completedAgents}/{agents.length} · {totalProgress}%
        </Text>
      </Box>

      {/* Agent Progress Bars */}
      <Box flexDirection="column" marginTop={1}>
        {agents.map(agent => (
          <AgentProgressBar
            key={agent.id}
            id={agent.id}
            agentId={agent.id}
            progress={agent.progress}
            status={agent.status}
          />
        ))}
      </Box>

      {/* Footer */}
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
          <Text color={theme.cynerza} bold>esc</Text> to interrupt
        </Text>
      </Box>
    </Box>
  )
}

