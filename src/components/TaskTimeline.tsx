/**
 * Task Timeline Component
 * 
 * Interactive timeline view showing task progression, checkpoints,
 * and parallel task branches.
 */

import { Box, Text } from 'ink'
import * as React from 'react'
import { useState, useEffect } from 'react'
import { getTheme } from '../utils/theme'
import { AgentTask } from '../types/agents'

// ============================================================================
// Types
// ============================================================================

export interface TimelineEvent {
  id: string
  type: 'start' | 'checkpoint' | 'milestone' | 'complete' | 'error' | 'branch'
  title: string
  timestamp: number
  agentId?: string
  description?: string
  children?: TimelineEvent[]
}

interface TaskTimelineProps {
  events: TimelineEvent[]
  currentTime?: number
  showDetails?: boolean
}

interface TimelineNodeProps {
  event: TimelineEvent
  isLast: boolean
  depth?: number
  currentTime?: number
}

// ============================================================================
// Event Configuration
// ============================================================================

const EVENT_CONFIG: Record<string, { icon: string; color: string }> = {
  start: { icon: '▶', color: '#6bcb77' },
  checkpoint: { icon: '◉', color: '#4d96ff' },
  milestone: { icon: '★', color: '#ffd93d' },
  complete: { icon: '✓', color: '#6bcb77' },
  error: { icon: '✗', color: '#ff6b6b' },
  branch: { icon: '⑂', color: '#9d65c9' },
}

// ============================================================================
// Timeline Node Component
// ============================================================================

function TimelineNode({ 
  event, 
  isLast, 
  depth = 0,
  currentTime,
}: TimelineNodeProps): React.ReactNode {
  const theme = getTheme()
  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.checkpoint
  
  const indent = '  '.repeat(depth)
  const connector = isLast ? '└─' : '├─'
  const line = isLast ? '  ' : '│ '

  // Format timestamp
  const timeAgo = currentTime 
    ? formatTimeAgo(event.timestamp, currentTime)
    : formatTime(event.timestamp)

  return (
    <Box flexDirection="column">
      {/* Event Line */}
      <Box flexDirection="row">
        <Text color={theme.secondaryText}>{indent}{connector}</Text>
        <Text color={config.color}>{config.icon} </Text>
        <Text color={theme.text} bold>{event.title}</Text>
        <Text color={theme.secondaryText}> · {timeAgo}</Text>
      </Box>

      {/* Description if present */}
      {event.description && (
        <Box marginLeft={depth * 2 + 4}>
          <Text color={theme.secondaryText} wrap="truncate-end">
            {event.description}
          </Text>
        </Box>
      )}

      {/* Nested events (branches) */}
      {event.children?.map((child, idx) => (
        <TimelineNode
          key={child.id}
          event={child}
          isLast={idx === event.children!.length - 1}
          depth={depth + 1}
          currentTime={currentTime}
        />
      ))}
    </Box>
  )
}

// ============================================================================
// Main Timeline Component
// ============================================================================

export function TaskTimeline({
  events,
  currentTime,
  showDetails = true,
}: TaskTimelineProps): React.ReactNode {
  const theme = getTheme()
  const [time, setTime] = useState(currentTime || Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp)

  // Calculate duration
  const startTime = sortedEvents[0]?.timestamp || time
  const duration = time - startTime

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.secondaryText}
      paddingX={1}
      marginY={1}
    >
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text color={theme.cynerza} bold>📋 Task Timeline</Text>
        <Text color={theme.secondaryText}>
          Duration: {formatDuration(duration)}
        </Text>
      </Box>

      {/* Timeline Events */}
      {sortedEvents.map((event, idx) => (
        <TimelineNode
          key={event.id}
          event={event}
          isLast={idx === sortedEvents.length - 1}
          currentTime={time}
        />
      ))}

      {/* Active indicator */}
      {events.some(e => e.type !== 'complete' && e.type !== 'error') && (
        <Box marginTop={1}>
          <Text color={theme.cynerza}>
            ● Active
          </Text>
        </Box>
      )}
    </Box>
  )
}

// ============================================================================
// Compact Timeline
// ============================================================================

interface CompactTimelineProps {
  tasks: AgentTask[]
}

export function CompactTimeline({ tasks }: CompactTimelineProps): React.ReactNode {
  const theme = getTheme()

  // Create a simple horizontal timeline
  const getStatusChar = (status: string): string => {
    switch (status) {
      case 'complete': return '●'
      case 'running': return '○'
      case 'error': return '✗'
      default: return '·'
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'complete': return '#6bcb77'
      case 'running': return theme.cynerza
      case 'error': return '#ff6b6b'
      default: return theme.secondaryText
    }
  }

  return (
    <Box flexDirection="row" gap={1}>
      <Text color={theme.secondaryText}>Timeline:</Text>
      {tasks.map((task, idx) => (
        <React.Fragment key={task.id}>
          <Text color={getStatusColor(task.status)}>
            {getStatusChar(task.status)}
          </Text>
          {idx < tasks.length - 1 && (
            <Text color={theme.secondaryText}>─</Text>
          )}
        </React.Fragment>
      ))}
    </Box>
  )
}

// ============================================================================
// Progress Timeline
// ============================================================================

interface ProgressTimelineProps {
  total: number
  completed: number
  current?: string
}

export function ProgressTimeline({
  total,
  completed,
  current,
}: ProgressTimelineProps): React.ReactNode {
  const theme = getTheme()
  
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  const remaining = total - completed

  return (
    <Box flexDirection="column">
      {/* Progress bar */}
      <Box flexDirection="row">
        <Text color={theme.secondaryText}>[</Text>
        {Array.from({ length: total }).map((_, idx) => (
          <Text
            key={idx}
            color={idx < completed ? '#6bcb77' : theme.secondaryText}
          >
            {idx < completed ? '█' : '░'}
          </Text>
        ))}
        <Text color={theme.secondaryText}>]</Text>
        <Text color={theme.text}> {progress}%</Text>
      </Box>

      {/* Current task */}
      {current && (
        <Text color={theme.secondaryText}>
          Current: {current}
        </Text>
      )}

      {/* Remaining */}
      <Text color={theme.secondaryText}>
        {remaining} task{remaining !== 1 ? 's' : ''} remaining
      </Text>
    </Box>
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatTimeAgo(timestamp: number, currentTime: number): string {
  const diff = currentTime - timestamp
  
  if (diff < 1000) return 'now'
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return `${Math.floor(diff / 3600000)}h ago`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`
}
