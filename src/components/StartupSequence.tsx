import { Box, Text } from 'ink'
import React, { useState, useEffect } from 'react'
import { AnimatedLogo } from './AnimatedLogo'
import { LoadingAnimation } from './LoadingAnimation'
import { getTheme } from '../utils/theme'
import { useFadeIn } from '../utils/animations'

interface StartupSequenceProps {
  onComplete: () => void
  skipAnimation?: boolean
}

type BootStep = {
  text: string
  duration: number
  icon?: string
}

const BOOT_STEPS: BootStep[] = [
  { text: 'Initializing AI Development Suite', duration: 600, icon: '⚡' },
  { text: 'Loading tools', duration: 400, icon: '🔧' },
  { text: 'Connecting to backend', duration: 500, icon: '🌐' },
  { text: 'Ready', duration: 300, icon: '✓' },
]

export function StartupSequence({
  onComplete,
  skipAnimation = false,
}: StartupSequenceProps): React.ReactElement {
  const theme = getTheme()
  const [phase, setPhase] = useState<'logo' | 'boot' | 'welcome' | 'complete'>('logo')
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const fadeOpacity = useFadeIn(theme.animations.medium)

  useEffect(() => {
    if (skipAnimation) {
      onComplete()
      return
    }

    // Phase 1: Logo reveal (0-1000ms)
    const logoTimer = setTimeout(() => {
      setPhase('boot')
    }, 1000)

    return () => clearTimeout(logoTimer)
  }, [skipAnimation, onComplete])

  useEffect(() => {
    if (phase !== 'boot') return

    // Phase 2: Boot steps (1000-2500ms)
    if (currentStep < BOOT_STEPS.length) {
      const step = BOOT_STEPS[currentStep]
      const timer = setTimeout(() => {
        setCompletedSteps(prev => [...prev, currentStep])
        setCurrentStep(prev => prev + 1)
      }, step.duration)

      return () => clearTimeout(timer)
    } else {
      // All steps complete, move to welcome
      setTimeout(() => {
        setPhase('welcome')
      }, 200)
    }
  }, [phase, currentStep])

  useEffect(() => {
    if (phase !== 'welcome') return

    // Phase 3: Welcome message (2500-3000ms)
    const welcomeTimer = setTimeout(() => {
      setPhase('complete')
      onComplete()
    }, 500)

    return () => clearTimeout(welcomeTimer)
  }, [phase, onComplete])

  if (phase === 'logo') {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        paddingY={2}
      >
        <AnimatedLogo state="startup" size="medium" />
      </Box>
    )
  }

  if (phase === 'boot') {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        paddingY={2}
        gap={1}
      >
        <AnimatedLogo state="idle" size="small" />
        <Box flexDirection="column" marginTop={2} gap={1}>
          {BOOT_STEPS.map((step, index) => {
            const isComplete = completedSteps.includes(index)
            const isCurrent = index === currentStep && !isComplete

            return (
              <Box key={index} gap={1}>
                {isComplete ? (
                  <Text color={theme.success}>{step.icon}</Text>
                ) : isCurrent ? (
                  <LoadingAnimation type="dots" color={theme.accent.primary} />
                ) : (
                  <Text dimColor>○</Text>
                )}
                <Text color={isComplete ? theme.success : theme.secondaryText}>
                  {step.text}
                  {isComplete && '...'}
                </Text>
              </Box>
            )
          })}
        </Box>
      </Box>
    )
  }

  if (phase === 'welcome') {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        paddingY={2}
        opacity={fadeOpacity}
      >
        <AnimatedLogo state="success" size="medium" showVersion />
        <Box marginTop={2}>
          <Text color={theme.accent.primary} bold>
            Welcome to Cyne AI Development Suite
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Your intelligent coding assistant is ready</Text>
        </Box>
      </Box>
    )
  }

  return <Box />
}
