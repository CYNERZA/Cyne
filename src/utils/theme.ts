import { getGlobalConfig } from './config'

export interface Theme {
  bashBorder: string
  cynerza: string
  permission: string
  secondaryBorder: string
  text: string
  secondaryText: string
  suggestion: string
  // Semantic colors
  success: string
  error: string
  warning: string
  diff: {
    added: string
    removed: string
    addedDimmed: string
    removedDimmed: string
  }
  // Enhanced colors for modern UI
  accent: {
    primary: string
    secondary: string
    tertiary: string
    glow: string
  }
  interactive: {
    hover: string
    active: string
    selected: string
  }
  status: {
    running: string
    pending: string
    completed: string
  }
  // Gradient definitions (arrays for smooth transitions)
  gradients: {
    primary: string[]
    border: string[]
    success: string[]
    error: string[]
    info: string[]
  }
  // Animation timing in milliseconds
  animations: {
    slow: number
    medium: number
    fast: number
  }
}

const lightTheme: Theme = {
  bashBorder: '#20B2AA',
  cynerza: '#9ACD32',
  permission: '#FF8C00',
  secondaryBorder: '#999',
  text: '#000',
  secondaryText: '#666',
  suggestion: '#8A2BE2',
  success: '#2c7a39',
  error: '#ab2b3f',
  warning: '#966c1e',
  diff: {
    added: '#69db7c',
    removed: '#ffa8b4',
    addedDimmed: '#c7e1cb',
    removedDimmed: '#fdd2d8',
  },
  accent: {
    primary: '#0ea5e9',
    secondary: '#d946ef',
    tertiary: '#8b5cf6',
    glow: '#0ea5e944',
  },
  interactive: {
    hover: '#0ea5e922',
    active: '#0ea5e944',
    selected: '#0ea5e9',
  },
  status: {
    running: '#3b82f6',
    pending: '#f59e0b',
    completed: '#10b981',
  },
  gradients: {
    primary: ['#0ea5e9', '#8b5cf6', '#d946ef'],
    border: ['#0ea5e9', '#14b8a6'],
    success: ['#10b981', '#34d399'],
    error: ['#ef4444', '#f87171'],
    info: ['#3b82f6', '#60a5fa'],
  },
  animations: {
    slow: 800,
    medium: 400,
    fast: 150,
  },
}

const lightDaltonizedTheme: Theme = {
  bashBorder: '#20B2AA',
  cynerza: '#9ACD32',
  permission: '#FF8C00',
  secondaryBorder: '#999',
  text: '#000',
  secondaryText: '#666',
  suggestion: '#8A2BE2',
  success: '#006699',
  error: '#cc0000',
  warning: '#ff9900',
  diff: {
    added: '#99ccff',
    removed: '#ffcccc',
    addedDimmed: '#d1e7fd',
    removedDimmed: '#ffe9e9',
  },
  accent: {
    primary: '#0284c7',
    secondary: '#c026d3',
    tertiary: '#7c3aed',
    glow: '#0284c744',
  },
  interactive: {
    hover: '#0284c722',
    active: '#0284c744',
    selected: '#0284c7',
  },
  status: {
    running: '#0369a1',
    pending: '#d97706',
    completed: '#047857',
  },
  gradients: {
    primary: ['#0284c7', '#7c3aed', '#c026d3'],
    border: ['#0284c7', '#0d9488'],
    success: ['#047857', '#059669'],
    error: ['#dc2626', '#ef4444'],
    info: ['#0369a1', '#0284c7'],
  },
  animations: {
    slow: 800,
    medium: 400,
    fast: 150,
  },
}

const darkTheme: Theme = {
  bashBorder: '#48D1CC',
  cynerza: '#9ACD32',
  permission: '#FFA500',
  secondaryBorder: '#888',
  text: '#fff',
  secondaryText: '#999',
  suggestion: '#DA70D6',
  success: '#4eba65',
  error: '#ff6b80',
  warning: '#ffc107',
  diff: {
    added: '#225c2b',
    removed: '#7a2936',
    addedDimmed: '#47584a',
    removedDimmed: '#69484d',
  },
  // Modern accent colors
  accent: {
    primary: '#00d9ff',    // Electric cyan
    secondary: '#ff00f7',  // Vibrant magenta
    tertiary: '#7c3aed',   // Rich purple
    glow: '#00ffff88',     // Cyan glow with transparency
  },
  interactive: {
    hover: '#00d9ff33',    // Subtle cyan highlight
    active: '#00d9ff66',   // Medium cyan highlight
    selected: '#00d9ff',   // Full cyan
  },
  status: {
    running: '#3b82f6',    // Blue for running
    pending: '#f59e0b',    // Amber for pending
    completed: '#10b981',  // Green for completed
  },
  gradients: {
    primary: ['#00d9ff', '#7c3aed', '#ff00f7'],  // Cyan → Purple → Magenta
    border: ['#00d9ff', '#00ffaa'],               // Cyan → Aqua
    success: ['#10b981', '#34d399'],              // Green gradient
    error: ['#ef4444', '#f87171'],                // Red gradient
    info: ['#3b82f6', '#60a5fa'],                 // Blue gradient
  },
  animations: {
    slow: 800,
    medium: 400,
    fast: 150,
  },
}

const darkDaltonizedTheme: Theme = {
  bashBorder: '#48D1CC',
  cynerza: '#9ACD32',
  permission: '#FFA500',
  secondaryBorder: '#888',
  text: '#fff',
  secondaryText: '#999',
  suggestion: '#DA70D6',
  success: '#3399ff',
  error: '#ff6666',
  warning: '#ffcc00',
  diff: {
    added: '#004466',
    removed: '#660000',
    addedDimmed: '#3e515b',
    removedDimmed: '#3e2c2c',
  },
  accent: {
    primary: '#22d3ee',
    secondary: '#e879f9',
    tertiary: '#a78bfa',
    glow: '#22d3ee88',
  },
  interactive: {
    hover: '#22d3ee33',
    active: '#22d3ee66',
    selected: '#22d3ee',
  },
  status: {
    running: '#60a5fa',
    pending: '#fbbf24',
    completed: '#34d399',
  },
  gradients: {
    primary: ['#22d3ee', '#a78bfa', '#e879f9'],
    border: ['#22d3ee', '#2dd4bf'],
    success: ['#34d399', '#6ee7b7'],
    error: ['#f87171', '#fca5a5'],
    info: ['#60a5fa', '#93c5fd'],
  },
  animations: {
    slow: 800,
    medium: 400,
    fast: 150,
  },
}

// Dracula Theme - Popular dark theme with purple accents
const draculaTheme: Theme = {
  bashBorder: '#8be9fd',
  cynerza: '#50fa7b',
  permission: '#ffb86c',
  secondaryBorder: '#6272a4',
  text: '#f8f8f2',
  secondaryText: '#6272a4',
  suggestion: '#ff79c6',
  success: '#50fa7b',
  error: '#ff5555',
  warning: '#f1fa8c',
  diff: {
    added: '#50fa7b44',
    removed: '#ff555544',
    addedDimmed: '#50fa7b22',
    removedDimmed: '#ff555522',
  },
  accent: {
    primary: '#bd93f9',
    secondary: '#ff79c6',
    tertiary: '#8be9fd',
    glow: '#bd93f988',
  },
  interactive: {
    hover: '#bd93f933',
    active: '#bd93f966',
    selected: '#bd93f9',
  },
  status: {
    running: '#8be9fd',
    pending: '#f1fa8c',
    completed: '#50fa7b',
  },
  gradients: {
    primary: ['#bd93f9', '#ff79c6', '#8be9fd'],
    border: ['#bd93f9', '#50fa7b'],
    success: ['#50fa7b', '#8be9fd'],
    error: ['#ff5555', '#ff79c6'],
    info: ['#8be9fd', '#bd93f9'],
  },
  animations: {
    slow: 800,
    medium: 400,
    fast: 150,
  },
}

// Monokai Theme - Classic vibrant coding theme
const monokaiTheme: Theme = {
  bashBorder: '#66d9ef',
  cynerza: '#a6e22e',
  permission: '#fd971f',
  secondaryBorder: '#75715e',
  text: '#f8f8f2',
  secondaryText: '#75715e',
  suggestion: '#ae81ff',
  success: '#a6e22e',
  error: '#f92672',
  warning: '#e6db74',
  diff: {
    added: '#a6e22e44',
    removed: '#f9267244',
    addedDimmed: '#a6e22e22',
    removedDimmed: '#f9267222',
  },
  accent: {
    primary: '#66d9ef',
    secondary: '#f92672',
    tertiary: '#ae81ff',
    glow: '#66d9ef88',
  },
  interactive: {
    hover: '#66d9ef33',
    active: '#66d9ef66',
    selected: '#66d9ef',
  },
  status: {
    running: '#66d9ef',
    pending: '#e6db74',
    completed: '#a6e22e',
  },
  gradients: {
    primary: ['#66d9ef', '#ae81ff', '#f92672'],
    border: ['#66d9ef', '#a6e22e'],
    success: ['#a6e22e', '#66d9ef'],
    error: ['#f92672', '#fd971f'],
    info: ['#66d9ef', '#ae81ff'],
  },
  animations: {
    slow: 800,
    medium: 400,
    fast: 150,
  },
}

// Red Theme - Crimson/scarlet color palette
const redTheme: Theme = {
  bashBorder: '#ff6b6b',
  cynerza: '#ff4757',
  permission: '#ff7f50',
  secondaryBorder: '#c44569',
  text: '#f8f8f2',
  secondaryText: '#cf6679',
  suggestion: '#ff79c6',
  success: '#50fa7b',
  error: '#ff5555',
  warning: '#ffa502',
  diff: {
    added: '#50fa7b44',
    removed: '#ff555544',
    addedDimmed: '#50fa7b22',
    removedDimmed: '#ff555522',
  },
  accent: {
    primary: '#ff4757',
    secondary: '#ff6b6b',
    tertiary: '#c44569',
    glow: '#ff475788',
  },
  interactive: {
    hover: '#ff475733',
    active: '#ff475766',
    selected: '#ff4757',
  },
  status: {
    running: '#ff6b6b',
    pending: '#ffa502',
    completed: '#50fa7b',
  },
  gradients: {
    primary: ['#ff4757', '#ff6b6b', '#c44569'],
    border: ['#ff4757', '#ff7f50'],
    success: ['#50fa7b', '#2ed573'],
    error: ['#ff4757', '#ff6b6b'],
    info: ['#ff6b6b', '#c44569'],
  },
  animations: {
    slow: 800,
    medium: 400,
    fast: 150,
  },
}

export type ThemeNames =
  | 'dark'
  | 'light'
  | 'light-daltonized'
  | 'dark-daltonized'
  | 'dracula'
  | 'monokai'
  | 'red'

export function getTheme(overrideTheme?: ThemeNames): Theme {
  const config = getGlobalConfig()
  switch (overrideTheme ?? config.theme) {
    case 'light':
      return lightTheme
    case 'light-daltonized':
      return lightDaltonizedTheme
    case 'dark-daltonized':
      return darkDaltonizedTheme
    case 'dracula':
      return draculaTheme
    case 'monokai':
      return monokaiTheme
    case 'red':
      return redTheme
    default:
      return darkTheme
  }
}
