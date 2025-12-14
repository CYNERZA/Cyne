/**
 * Thought Process Component
 * 
 * Collapsible display of agent thinking and decision-making process
 * with expandable reasoning steps and tool call visualization.
 */

import { Box, Text, useFocus } from 'ink'
import * as React from 'react'
import { useState, useCallback } from 'react'
import { getTheme } from '../utils/theme'

// ============================================================================
// Types
// ============================================================================

export interface ThoughtStep {
  id: string
  type: 'thinking' | 'tool_call' | 'decision' | 'result'
  title: string
  content?: string
  timestamp: number
  duration?: number
  nested?: ThoughtStep[]
}

interface ThoughtProcessProps {
  steps: ThoughtStep[]
  title?: string
  collapsed?: boolean
  maxVisible?: number
}

interface ThoughtStepProps {
  step: ThoughtStep
  depth?: number
  isLast?: boolean
}

// ============================================================================
// Icons and Styling
// ============================================================================

const STEP_CONFIG: Record<string, { icon: string; color: string }> = {
  thinking: { icon: '💭', color: '#9d65c9' },
  tool_call: { icon: '🔧', color: '#4d96ff' },
  decision: { icon: '🎯', color: '#6bcb77' },
  result: { icon: '✨', color: '#ffd93d' },
}

// ============================================================================
// Individual Thought Step Component
// ============================================================================

function ThoughtStep({ step, depth = 0, isLast = false }: ThoughtStepProps): React.ReactNode {
  const theme = getTheme()
  const [expanded, setExpanded] = useState(false)
  const config = STEP_CONFIG[step.type] || STEP_CONFIG.thinking

  const indent = '  '.repeat(depth)
  const connector = isLast ? '└─' : '├─'
  const line = isLast ? '  ' : '│ '

  const handleToggle = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])

  return (
    <Box flexDirection="column">
      {/* Step Header */}
      <Box flexDirection="row">
        <Text color={theme.secondaryText}>{indent}{connector}</Text>
        <Text color={config.color}>{config.icon} </Text>
        <Text color={theme.text} bold>{step.title}</Text>
        {step.duration && (
          <Text color={theme.secondaryText}> ({step.duration}ms)</Text>
        )}
        {step.content && (
          <Text color={theme.cynerza}> [{expanded ? '▼' : '▶'}]</Text>
        )}
      </Box>

      {/* Expanded Content */}
      {expanded && step.content && (
        <Box flexDirection="column" marginLeft={depth + 3}>
          <Text color={theme.secondaryText} wrap="wrap">
            {step.content}
          </Text>
        </Box>
      )}

      {/* Nested Steps */}
      {step.nested?.map((nestedStep, idx) => (
        <ThoughtStep
          key={nestedStep.id}
          step={nestedStep}
          depth={depth + 1}
          isLast={idx === step.nested!.length - 1}
        />
      ))}
    </Box>
  )
}

// ============================================================================
// Thought Process Container
// ============================================================================

export function ThoughtProcess({ 
  steps, 
  title = 'Thinking Process',
  collapsed = true,
  maxVisible = 5,
}: ThoughtProcessProps): React.ReactNode {
  const theme = getTheme()
  const [isCollapsed, setIsCollapsed] = useState(collapsed)
  const [showAll, setShowAll] = useState(false)

  const visibleSteps = showAll ? steps : steps.slice(0, maxVisible)
  const hasMore = steps.length > maxVisible

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.secondaryText}
      paddingX={1}
      marginY={1}
    >
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.cynerza}>💭</Text>
          <Text color={theme.text} bold>{title}</Text>
          <Text color={theme.secondaryText}>({steps.length} steps)</Text>
        </Box>
        <Text color={theme.cynerza}>
          {isCollapsed ? '[▶ expand]' : '[▼ collapse]'}
        </Text>
      </Box>

      {/* Steps */}
      {!isCollapsed && (
        <Box flexDirection="column" marginTop={1}>
          {visibleSteps.map((step, idx) => (
            <ThoughtStep
              key={step.id}
              step={step}
              isLast={idx === visibleSteps.length - 1}
            />
          ))}

          {/* Show More/Less */}
          {hasMore && (
            <Box marginTop={1}>
              <Text color={theme.cynerza}>
                {showAll 
                  ? `[Show less]` 
                  : `[Show ${steps.length - maxVisible} more...]`}
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

// ============================================================================
// Live Thinking Indicator
// ============================================================================

interface LiveThinkingProps {
  agentName?: string
  message?: string
}

export function LiveThinking({ 
  agentName = 'Cyne', 
  message = 'Processing...' 
}: LiveThinkingProps): React.ReactNode {
  const theme = getTheme()
  const [dots, setDots] = useState('')

  React.useEffect(() => {
    const timer = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 400)
    return () => clearInterval(timer)
  }, [])

  return (
    <Box flexDirection="row" gap={1}>
      <Text color={theme.cynerza}>💭</Text>
      <Text color={theme.text}>{agentName} is thinking</Text>
      <Text color={theme.secondaryText}>{message}{dots}</Text>
    </Box>
  )
}

// ============================================================================
// Decision Tree View
// ============================================================================

export interface DecisionNode {
  id: string
  question: string
  answer?: string
  confidence?: number
  children?: DecisionNode[]
}

interface DecisionTreeProps {
  root: DecisionNode
  maxDepth?: number
}

export function DecisionTree({ root, maxDepth = 3 }: DecisionTreeProps): React.ReactNode {
  const theme = getTheme()

  const renderNode = (node: DecisionNode, depth: number, isLast: boolean): React.ReactNode => {
    if (depth > maxDepth) return null

    const indent = '  '.repeat(depth)
    const connector = isLast ? '└─' : '├─'

    return (
      <Box flexDirection="column" key={node.id}>
        <Box flexDirection="row">
          <Text color={theme.secondaryText}>{indent}{connector}</Text>
          <Text color={theme.cynerza}>❓ </Text>
          <Text color={theme.text}>{node.question}</Text>
        </Box>

        {node.answer && (
          <Box flexDirection="row">
            <Text color={theme.secondaryText}>{indent}  </Text>
            <Text color="#6bcb77">→ </Text>
            <Text color={theme.text}>{node.answer}</Text>
            {node.confidence !== undefined && (
              <Text color={theme.secondaryText}> ({Math.round(node.confidence * 100)}%)</Text>
            )}
          </Box>
        )}

        {node.children?.map((child, idx) =>
          renderNode(child, depth + 1, idx === node.children!.length - 1)
        )}
      </Box>
    )
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.secondaryText}
      paddingX={1}
      marginY={1}
    >
      <Text color={theme.cynerza} bold>🌳 Decision Tree</Text>
      {renderNode(root, 0, true)}
    </Box>
  )
}
