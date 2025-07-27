import { Box, Text } from 'ink'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { getTheme } from '../utils/theme'
import { sample } from 'lodash-es'
import { getSessionState } from '../utils/sessionState'

// Enhanced spinner patterns for better visibility
const BUBBLE_PATTERNS = [
  // Large rotating dots
  ['●   ', ' ●  ', '  ● ', '   ●', '  ● ', ' ●  '],
  // Pulsing circles
  ['○○○ ', '●○○ ', '●●○ ', '●●● ', '○●● ', '○○● ', '○○○ '],
  // Loading bars
  ['▱▱▱▱', '▰▱▱▱', '▰▰▱▱', '▰▰▰▱', '▰▰▰▰', '▱▰▰▰', '▱▱▰▰', '▱▱▱▰'],
  // Spinning arrows
  ['→   ', ' ↘  ', '  ↓ ', '   ↙', '    ←', '   ↖', '  ↑ ', ' ↗  '],
  // Bouncing ball
  ['●   ', ' ●  ', '  ● ', '   ●', '  ● ', ' ●  '],
  // Pulse effect
  ['◯   ', '◉   ', '●   ', '◉   ', '◯   ', '    '],
  // Progress dots
  ['.   ', '..  ', '... ', '....', ' ...', '  ..', '   .', '    '],
  // Star rotation
  ['✦   ', ' ✧  ', '  ✦ ', '   ✧', '  ✦ ', ' ✧  '],
  // Wave pattern
  ['▁▁▁▁', '▂▁▁▁', '▃▂▁▁', '▄▃▂▁', '▅▄▃▂', '▆▅▄▃', '▇▆▅▄', '█▇▆▅', '▇▆▅▄', '▆▅▄▃', '▅▄▃▂', '▄▃▂▁', '▃▂▁▁', '▂▁▁▁'],
  // Orbital
  ['◐   ', ' ◓  ', '  ◑ ', '   ◒', '  ◑ ', ' ◓  '],
  // Gear rotation
  ['⚙   ', ' ⚙  ', '  ⚙ ', '   ⚙', '  ⚙ ', ' ⚙  '],
  // DNA helix
  ['╱   ', ' ╲  ', '  ╱ ', '   ╲', '  ╱ ', ' ╲  '],
  // Blocks
  ['█   ', '▉   ', '▊   ', '▋   ', '▌   ', '▍   ', '▎   ', '▏   '],
  // Hearts
  ['♡   ', ' ♥  ', '  ♡ ', '   ♥', '  ♡ ', ' ♥  '],
]

const MESSAGES = [
  'Bubbling',
  'Cynering',
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

export function Spinner(): React.ReactNode {
  const [patternFrame, setPatternFrame] = useState(0)
  const [currentPattern] = useState(() => sample(BUBBLE_PATTERNS) || BUBBLE_PATTERNS[0])
  const [elapsedTime, setElapsedTime] = useState(0)
  const message = useRef(sample(MESSAGES))
  const startTime = useRef(Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setPatternFrame(pf => (pf + 1) % currentPattern.length)
    }, 200) // Slightly slower for better visibility of larger patterns

    return () => clearInterval(timer)
  }, [currentPattern.length])

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.current) / 1000))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

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

export function SimpleSpinner(): React.ReactNode {
  const [currentPattern] = useState(() => sample(BUBBLE_PATTERNS) || BUBBLE_PATTERNS[0])
  const [patternFrame, setPatternFrame] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setPatternFrame(pf => (pf + 1) % currentPattern.length)
    }, 200)

    return () => clearInterval(timer)
  }, [currentPattern.length])

  return (
    <Box flexWrap="nowrap" height={1} width={6}>
      <Text color={getTheme().cynerza} bold>
        {currentPattern[patternFrame]}
      </Text>
    </Box>
  )
}
