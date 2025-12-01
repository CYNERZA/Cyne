import { Box, Text } from 'ink'
import React, { useState, useEffect } from 'react'
import { getTheme } from '../utils/theme'
import { usePulse } from '../utils/animations'

export type LoaderType = 'wave' | 'dots' | 'bars' | 'progress' | 'pulse' | 'particle'

interface LoadingAnimationProps {
  type?: LoaderType
  text?: string
  progress?: number // 0-100 for progress bar
  color?: string
}

export function LoadingAnimation({
  type = 'wave',
  text,
  progress,
  color,
}: LoadingAnimationProps): React.ReactElement {
  const theme = getTheme()
  const displayColor = color || theme.accent.primary

  switch (type) {
    case 'wave':
      return <WaveLoader text={text} color={displayColor} />
    case 'dots':
      return <DotsLoader text={text} color={displayColor} />
    case 'bars':
      return <BarsLoader text={text} color={displayColor} />
    case 'progress':
      return <ProgressLoader text={text} color={displayColor} progress={progress || 0} />
    case 'pulse':
      return <PulseLoader text={text} color={displayColor} />
    case 'particle':
      return <ParticleLoader text={text} color={displayColor} />
    default:
      return <DotsLoader text={text} color={displayColor} />
  }
}

function WaveLoader({ text, color }: { text?: string; color: string }) {
  const [frame, setFrame] = useState(0)
  const waves = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 8)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const wavePattern = [
    waves[(frame + 0) % 8],
    waves[(frame + 1) % 8],
    waves[(frame + 2) % 8],
    waves[(frame + 3) % 8],
    waves[(frame + 2) % 8],
    waves[(frame + 1) % 8],
  ].join('')

  return (
    <Box gap={1}>
      <Text color={color}>{wavePattern}</Text>
      {text && <Text>{text}</Text>}
    </Box>
  )
}

function DotsLoader({ text, color }: { text?: string; color: string }) {
  const [dots, setDots] = useState(1)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => (d % 3) + 1)
    }, 400)
    return () => clearInterval(interval)
  }, [])

  return (
    <Box gap={1}>
      <Text color={color}>{'●'.repeat(dots)}{'○'.repeat(3 - dots)}</Text>
      {text && <Text>{text}</Text>}
    </Box>
  )
}

function BarsLoader({ text, color }: { text?: string; color: string }) {
  const [position, setPosition] = useState(0)
  const bars = ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█']
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPosition(p => (p + 1) % 8)
    }, 80)
    return () => clearInterval(interval)
  }, [])

  return (
    <Box gap={1}>
      <Text color={color}>{bars[position]}</Text>
      {text && <Text>{text}</Text>}
    </Box>
  )
}

function ProgressLoader({
  text,
  color,
  progress,
}: {
  text?: string
  color: string
  progress: number
}) {
  const theme = getTheme()
  const barWidth = 30
  const filled = Math.round((progress / 100) * barWidth)
  const empty = barWidth - filled
  
  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text color={color}>▐</Text>
        <Text color={theme.gradients.success[0]}>{'█'.repeat(filled)}</Text>
        <Text dimColor>{'░'.repeat(empty)}</Text>
        <Text color={color}>▌</Text>
        <Text>{progress.toFixed(0)}%</Text>
      </Box>
      {text && <Text dimColor>{text}</Text>}
    </Box>
  )
}

function PulseLoader({ text, color }: { text?: string; color: string }) {
  const pulseOpacity = usePulse(0.3, 1.0, 800)
  
  return (
    <Box gap={1}>
      <Text color={color} opacity={pulseOpacity}>◉</Text>
      {text && <Text>{text}</Text>}
    </Box>
  )
}

function ParticleLoader({ text, color }: { text?: string; color: string }) {
  const [frame, setFrame] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 4)
    }, 150)
    return () => clearInterval(interval)
  }, [])

  const patterns = [
    '∙ ∙ ∙ ○',
    '∙ ∙ ○ ∙',
    '∙ ○ ∙ ∙',
    '○ ∙ ∙ ∙',
  ]

  return (
    <Box gap={1}>
      <Text color={color}>{patterns[frame]}</Text>
      {text && <Text>{text}</Text>}
    </Box>
  )
}
