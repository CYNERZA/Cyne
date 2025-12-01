import { useState, useEffect } from 'react'
import { getTheme } from './theme'

/**
 * Typewriter effect hook - reveals text character by character
 * @param text - The text to animate
 * @param speed - Characters per second (default: 50)
 * @param enabled - Whether animation is enabled
 * @returns Current revealed text
 */
export function useTypewriter(
  text: string,
  speed: number = 50,
  enabled: boolean = true,
): string {
  const [displayText, setDisplayText] = useState('')

  useEffect(() => {
    if (!enabled) {
      setDisplayText(text)
      return
    }

    setDisplayText('')
    let currentIndex = 0
    const intervalMs = 1000 / speed

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayText(text.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(interval)
      }
    }, intervalMs)

    return () => clearInterval(interval)
  }, [text, speed, enabled])

  return displayText
}

/**
 * Fade-in effect hook
 * @param duration - Fade duration in milliseconds
 * @returns Opacity value (0 to 1)
 */
export function useFadeIn(duration: number = 400): number {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      setOpacity(progress)
      
      if (progress >= 1) {
        clearInterval(interval)
      }
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [duration])

  return opacity
}

/**
 * Pulsing glow effect hook
 * @param minOpacity - Minimum opacity (default: 0.4)
 * @param maxOpacity - Maximum opacity (default: 1.0)
 * @param duration - Pulse cycle duration in milliseconds
 * @returns Current opacity value
 */
export function usePulse(
  minOpacity: number = 0.4,
  maxOpacity: number = 1.0,
  duration: number = 1000,
): number {
  const [opacity, setOpacity] = useState(maxOpacity)

  useEffect(() => {
    const startTime = Date.now()
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = (elapsed % duration) / duration
      // Sine wave for smooth pulsing
      const sineValue = Math.sin(progress * Math.PI * 2)
      const normalizedValue = (sineValue + 1) / 2 // 0 to 1
      const currentOpacity = minOpacity + (maxOpacity - minOpacity) * normalizedValue
      setOpacity(currentOpacity)
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [minOpacity, maxOpacity, duration])

  return opacity
}

/**
 * Gradient cycling hook - cycles through gradient colors
 * @param gradientColors - Array of colors to cycle through
 * @param duration - Duration for full cycle in milliseconds
 * @returns Current gradient color array
 */
export function useGradientCycle(
  gradientColors: string[],
  duration: number = 3000,
): string[] {
  const [currentColors, setCurrentColors] = useState(gradientColors)

  useEffect(() => {
    if (gradientColors.length < 2) {
      return
    }

    const startTime = Date.now()
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = (elapsed % duration) / duration
      const rotatedIndex = Math.floor(progress * gradientColors.length)
      
      // Rotate the array
      const rotated = [
        ...gradientColors.slice(rotatedIndex),
        ...gradientColors.slice(0, rotatedIndex),
      ]
      setCurrentColors(rotated)
    }, 100) // Update every 100ms

    return () => clearInterval(interval)
  }, [gradientColors, duration])

  return currentColors
}

/**
 * Generates a gradient text effect using available colors
 * Note: Limited support in terminal - works best with true color terminals
 */
export function getGradientText(text: string, colors: string[]): string {
  if (colors.length === 0) return text
  if (colors.length === 1) return text // No gradient needed
  
  const length = text.length
  const segments: string[] = []
  
  for (let i = 0; i < length; i++) {
    const progress = i / (length - 1 || 1)
    const colorIndex = Math.floor(progress * (colors.length - 1))
    const color = colors[colorIndex]
    segments.push(text[i])
  }
  
  return segments.join('')
}

/**
 * Slide-in animation hook
 * @param direction - Direction to slide from ('left' | 'right' | 'top' | 'bottom')
 * @param duration - Animation duration in milliseconds
 * @returns Position offset value (0 when complete)
 */
export function useSlideIn(
  direction: 'left' | 'right' | 'top' | 'bottom' = 'left',
  duration: number = 300,
): number {
  const [offset, setOffset] = useState(100)

  useEffect(() => {
    const startTime = Date.now()
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic for smooth deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      setOffset(100 * (1 - easedProgress))
      
      if (progress >= 1) {
        clearInterval(interval)
      }
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [duration])

  return offset
}
