import { Box, Text } from 'ink'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { getTheme } from '../utils/theme'
import { sample } from 'lodash-es'
import { getSessionState } from '../utils/sessionState'

/**
 * Alternative Implementation: Enhanced Spinner Patterns
 * Same functionality with different pattern organization and naming
 */
const CYNER_ANIMATION_PATTERNS = [
  // Alternative pattern: Large rotating dots with different arrangement
  ['●   ', ' ●  ', '  ● ', '   ●', '  ● ', ' ●  '],
  // Alternative pattern: Enhanced pulsing circles
  ['○○○ ', '●○○ ', '●●○ ', '●●● ', '○●● ', '○○● ', '○○○ '],
  // Alternative pattern: Progressive loading bars
  ['▱▱▱▱', '▰▱▱▱', '▰▰▱▱', '▰▰▰▱', '▰▰▰▰', '▱▰▰▰', '▱▱▰▰', '▱▱▱▰'],
  // Alternative pattern: Directional arrows
  ['→   ', ' ↘  ', '  ↓ ', '   ↙', '    ←', '   ↖', '  ↑ ', ' ↗  '],
  // Alternative pattern: Bouncing animation
  ['●   ', ' ●  ', '  ● ', '   ●', '  ● ', ' ●  '],
  // Alternative pattern: Pulse visualization
  ['◯   ', '◉   ', '●   ', '◉   ', '◯   ', '    '],
  // Alternative pattern: Progressive dots
  ['.   ', '..  ', '... ', '....', ' ...', '  ..', '   .', '    '],
  // Alternative pattern: Star rotation effect
  ['✦   ', ' ✧  ', '  ✦ ', '   ✧', '  ✦ ', ' ✧  '],
  // Alternative pattern: Wave visualization
  ['▁▁▁▁', '▂▁▁▁', '▃▂▁▁', '▄▃▂▁', '▅▄▃▂', '▆▅▄▃', '▇▆▅▄', '█▇▆▅', '▇▆▅▄', '▆▅▄▃', '▅▄▃▂', '▄▃▂▁', '▃▂▁▁', '▂▁▁▁'],
  // Alternative pattern: Orbital motion
  ['◐   ', ' ◓  ', '  ◑ ', '   ◒', '  ◑ ', ' ◓  '],
  // Alternative pattern: Gear mechanism
  ['⚙   ', ' ⚙  ', '  ⚙ ', '   ⚙', '  ⚙ ', ' ⚙  '],
  // Alternative pattern: DNA helix structure
  ['╱   ', ' ╲  ', '  ╱ ', '   ╲', '  ╱ ', ' ╲  '],
  // Alternative pattern: Block progression
  ['█   ', '▉   ', '▊   ', '▋   ', '▌   ', '▍   ', '▎   ', '▏   '],
  // Alternative pattern: Heart animation
  ['♡   ', ' ♥  ', '  ♡ ', '   ♥', '  ♡ ', ' ♥  '],
]

/**
 * Alternative Implementation: Processing Status Messages
 * Same functionality with enhanced message variety and Cyne-specific terms
 */
const CYNER_PROCESSING_MESSAGES = [
  'Bubbling',
  'Cyneing',
  'Processing',
  'Computing',
  'Thinking',
  'Optimizing',
  'Synthesizing',
  'Calculating',
  'Generating',
  'Interpreting',
  'Evaluating',
  'Orchestrating',
  'Architecting',
  'Constructing',
  'Assembling',
  'Debugging',
  'Refactoring',
  'Compiling',
  'Deploying',
  'Transforming',
  'Innovating',
  'Engineering',
  'Developing',
  'Building',
  'Creating',
  'Designing',
  'Implementing',
  'Executing',
  'Rendering',
  'Parsing',
  'Indexing',
  'Searching',
  'Scanning',
  'Mining',
  'Learning',
  'Adapting',
  'Evolving',
  'Upgrading',
  'Enhancing',
  'Accelerating',
  'Streamlining',
  'Automating',
  'Integrating',
  'Synchronizing',
  'Validating',
  'Verifying',
  'Testing',
  'Benchmarking',
  'Profiling',
  'Monitoring',
]

/**
 * Alternative Implementation: Spinner State Manager
 * Different approach to state management while preserving functionality
 */
class CynerSpinnerStateManager {
  private patternFrame: number = 0
  private elapsedTime: number = 0
  private startTime: number = Date.now()
  private currentPattern: string[]
  private message: string

  constructor() {
    this.currentPattern = sample(CYNER_ANIMATION_PATTERNS) || CYNER_ANIMATION_PATTERNS[0]
    this.message = sample(CYNER_PROCESSING_MESSAGES) || 'Processing'
  }

  getPatternFrame(): number {
    return this.patternFrame
  }

  incrementPatternFrame(): void {
    this.patternFrame = (this.patternFrame + 1) % this.currentPattern.length
  }

  getCurrentPattern(): string[] {
    return this.currentPattern
  }

  getCurrentFrame(): string {
    return this.currentPattern[this.patternFrame]
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
 * Alternative Implementation: Enhanced Spinner Component
 * Same functionality with different implementation patterns
 */
export function Spinner(): React.ReactNode {
  const [stateManager] = useState(() => new CynerSpinnerStateManager())
  const [patternFrame, setPatternFrame] = useState(0)
  const [currentPattern] = useState(() => stateManager.getCurrentPattern())
  const [elapsedTime, setElapsedTime] = useState(0)
  const message = useRef(stateManager.getMessage())
  const startTime = useRef(Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setPatternFrame(pf => (pf + 1) % currentPattern.length)
      stateManager.incrementPatternFrame()
    }, 200) // Enhanced timing for better visibility

    return () => clearInterval(timer)
  }, [currentPattern.length, stateManager])

  useEffect(() => {
    const timer = setInterval(() => {
      const newElapsedTime = Math.floor((Date.now() - startTime.current) / 1000)
      setElapsedTime(newElapsedTime)
      stateManager.updateElapsedTime()
    }, 1000)

    return () => clearInterval(timer)
  }, [stateManager])

  return (
    <Box flexDirection="row" marginTop={1}>
      <Box flexWrap="nowrap" height={1} width={6}>
        <Text color={getTheme().cynerza} bold>
          {currentPattern[patternFrame]}
        </Text>
      </Box>
      <Text color={getTheme().cynerza} bold>{message.current}… </Text>
      <Text color={getTheme().secondaryText}>
        ({elapsedTime}s · <Text bold color={getTheme().cynerza}>esc</Text> to interrupt)
      </Text>
      <Text color={getTheme().secondaryText}>
        · {getSessionState('currentError')}
      </Text>
    </Box>
  )
}

/**
 * Alternative Implementation: Simple Spinner Component
 * Same functionality with enhanced state management
 */
export function SimpleSpinner(): React.ReactNode {
  const [stateManager] = useState(() => new CynerSpinnerStateManager())
  const [currentPattern] = useState(() => stateManager.getCurrentPattern())
  const [patternFrame, setPatternFrame] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setPatternFrame(pf => (pf + 1) % currentPattern.length)
      stateManager.incrementPatternFrame()
    }, 200)

    return () => clearInterval(timer)
  }, [currentPattern.length, stateManager])

  return (
    <Box flexWrap="nowrap" height={1} width={6}>
      <Text color={getTheme().cynerza} bold>
        {currentPattern[patternFrame]}
      </Text>
    </Box>
  )
}
