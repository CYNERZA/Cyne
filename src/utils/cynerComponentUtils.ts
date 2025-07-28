/**
 * Alternative Implementation: Cyne UI Component Utilities
 * This module demonstrates alternative patterns for UI component logic
 * while preserving the same functionality as the original implementations
 */

import * as React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'

/**
 * Alternative Implementation: Component State Manager Interface
 * Different approach to managing component state
 */
export interface CynerComponentStateManager<T = any> {
  getState(): T
  setState(newState: Partial<T>): void
  resetState(): void
  subscribeToChanges(callback: (state: T) => void): () => void
}

/**
 * Alternative Implementation: Generic Component State Manager
 * Enhanced state management for React components
 */
export class CynerGenericStateManager<T extends Record<string, any>> implements CynerComponentStateManager<T> {
  private state: T
  private initialState: T
  private subscribers: ((state: T) => void)[] = []

  constructor(initialState: T) {
    this.initialState = { ...initialState }
    this.state = { ...initialState }
  }

  getState(): T {
    return { ...this.state }
  }

  setState(newState: Partial<T>): void {
    this.state = { ...this.state, ...newState }
    this.notifySubscribers()
  }

  resetState(): void {
    this.state = { ...this.initialState }
    this.notifySubscribers()
  }

  subscribeToChanges(callback: (state: T) => void): () => void {
    this.subscribers.push(callback)
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.getState()))
  }
}

/**
 * Alternative Implementation: Custom Hook for State Management
 * Enhanced React hook with different patterns
 */
export function useCynerStateManager<T extends Record<string, any>>(
  initialState: T
): [T, (newState: Partial<T>) => void, () => void] {
  const stateManager = useMemo(() => new CynerGenericStateManager(initialState), [])
  const [state, setState] = useState<T>(stateManager.getState())

  useEffect(() => {
    const unsubscribe = stateManager.subscribeToChanges(setState)
    return unsubscribe
  }, [stateManager])

  const updateState = useCallback((newState: Partial<T>) => {
    stateManager.setState(newState)
  }, [stateManager])

  const resetState = useCallback(() => {
    stateManager.resetState()
  }, [stateManager])

  return [state, updateState, resetState]
}

/**
 * Alternative Implementation: Animation State Manager
 * Different approach to managing animation states
 */
export class CynerAnimationStateManager {
  private isAnimating: boolean = false
  private animationFrame: number | null = null
  private startTime: number = 0
  private duration: number = 1000
  private onUpdate?: (progress: number) => void
  private onComplete?: () => void

  constructor(duration: number = 1000) {
    this.duration = duration
  }

  startAnimation(onUpdate?: (progress: number) => void, onComplete?: () => void): void {
    if (this.isAnimating) {
      this.stopAnimation()
    }

    this.isAnimating = true
    this.startTime = performance.now()
    this.onUpdate = onUpdate
    this.onComplete = onComplete

    this.animate()
  }

  stopAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
    this.isAnimating = false
  }

  private animate = (): void => {
    if (!this.isAnimating) return

    const currentTime = performance.now()
    const elapsed = currentTime - this.startTime
    const progress = Math.min(elapsed / this.duration, 1)

    if (this.onUpdate) {
      this.onUpdate(progress)
    }

    if (progress >= 1) {
      this.isAnimating = false
      if (this.onComplete) {
        this.onComplete()
      }
    } else {
      this.animationFrame = requestAnimationFrame(this.animate)
    }
  }

  getIsAnimating(): boolean {
    return this.isAnimating
  }

  setDuration(duration: number): void {
    this.duration = duration
  }
}

/**
 * Alternative Implementation: Custom Hook for Animation
 * Enhanced animation management with different patterns
 */
export function useCynerAnimation(
  duration: number = 1000
): [boolean, (onUpdate?: (progress: number) => void, onComplete?: () => void) => void, () => void] {
  const animationManager = useMemo(() => new CynerAnimationStateManager(duration), [duration])
  const [isAnimating, setIsAnimating] = useState(false)

  const startAnimation = useCallback((
    onUpdate?: (progress: number) => void,
    onComplete?: () => void
  ) => {
    setIsAnimating(true)
    animationManager.startAnimation(
      onUpdate,
      () => {
        setIsAnimating(false)
        if (onComplete) onComplete()
      }
    )
  }, [animationManager])

  const stopAnimation = useCallback(() => {
    animationManager.stopAnimation()
    setIsAnimating(false)
  }, [animationManager])

  useEffect(() => {
    return () => {
      animationManager.stopAnimation()
    }
  }, [animationManager])

  return [isAnimating, startAnimation, stopAnimation]
}

/**
 * Alternative Implementation: Timing Utility Manager
 * Different approach to timing and interval management
 */
export class CynerTimingManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private timeouts: Map<string, NodeJS.Timeout> = new Map()

  setInterval(id: string, callback: () => void, delay: number): void {
    this.clearInterval(id)
    const intervalId = setInterval(callback, delay)
    this.intervals.set(id, intervalId)
  }

  clearInterval(id: string): void {
    const intervalId = this.intervals.get(id)
    if (intervalId) {
      clearInterval(intervalId)
      this.intervals.delete(id)
    }
  }

  setTimeout(id: string, callback: () => void, delay: number): void {
    this.clearTimeout(id)
    const timeoutId = setTimeout(() => {
      callback()
      this.timeouts.delete(id)
    }, delay)
    this.timeouts.set(id, timeoutId)
  }

  clearTimeout(id: string): void {
    const timeoutId = this.timeouts.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.timeouts.delete(id)
    }
  }

  clearAll(): void {
    this.intervals.forEach(intervalId => clearInterval(intervalId))
    this.timeouts.forEach(timeoutId => clearTimeout(timeoutId))
    this.intervals.clear()
    this.timeouts.clear()
  }

  getActiveIntervals(): string[] {
    return Array.from(this.intervals.keys())
  }

  getActiveTimeouts(): string[] {
    return Array.from(this.timeouts.keys())
  }
}

/**
 * Alternative Implementation: Custom Hook for Timing
 * Enhanced timing management with different patterns
 */
export function useCynerTiming(): {
  setInterval: (id: string, callback: () => void, delay: number) => void
  clearInterval: (id: string) => void
  setTimeout: (id: string, callback: () => void, delay: number) => void
  clearTimeout: (id: string) => void
} {
  const timingManager = useMemo(() => new CynerTimingManager(), [])

  useEffect(() => {
    return () => {
      timingManager.clearAll()
    }
  }, [timingManager])

  return {
    setInterval: timingManager.setInterval.bind(timingManager),
    clearInterval: timingManager.clearInterval.bind(timingManager),
    setTimeout: timingManager.setTimeout.bind(timingManager),
    clearTimeout: timingManager.clearTimeout.bind(timingManager),
  }
}

/**
 * Alternative Implementation: Component Event Manager
 * Different approach to component-level event handling
 */
export class CynerComponentEventManager {
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map()

  on(event: string, handler: (data: any) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)

    return () => {
      const handlers = this.eventHandlers.get(event)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index > -1) {
          handlers.splice(index, 1)
        }
      }
    }
  }

  emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in component event handler for ${event}:`, error)
        }
      })
    }
  }

  off(event: string): void {
    this.eventHandlers.delete(event)
  }

  clearAll(): void {
    this.eventHandlers.clear()
  }
}

/**
 * Alternative Implementation: Custom Hook for Component Events
 * Enhanced event management for React components
 */
export function useCynerComponentEvents(): {
  on: (event: string, handler: (data: any) => void) => () => void
  emit: (event: string, data?: any) => void
  off: (event: string) => void
} {
  const eventManager = useMemo(() => new CynerComponentEventManager(), [])

  useEffect(() => {
    return () => {
      eventManager.clearAll()
    }
  }, [eventManager])

  return {
    on: eventManager.on.bind(eventManager),
    emit: eventManager.emit.bind(eventManager),
    off: eventManager.off.bind(eventManager),
  }
}
