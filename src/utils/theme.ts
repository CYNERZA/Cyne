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
}

const lightDaltonizedTheme: Theme = {
  bashBorder: '#20B2AA', // Light sea green for better contrast
  cynerza: '#9ACD32', // Yellowish green for better visibility
  permission: '#FF8C00', // Orange for better visibility and contrast
  secondaryBorder: '#999',
  text: '#000',
  secondaryText: '#666',
  suggestion: '#8A2BE2', // Purple for better contrast with green
  success: '#006699', // Blue instead of green
  error: '#cc0000', // Pure red for better distinction
  warning: '#ff9900', // Orange adjusted for deuteranopia
  diff: {
    added: '#99ccff', // Light blue instead of green
    removed: '#ffcccc', // Light red for better contrast
    addedDimmed: '#d1e7fd',
    removedDimmed: '#ffe9e9',
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
}

const darkDaltonizedTheme: Theme = {
  bashBorder: '#48D1CC', // Medium turquoise for better visibility
  cynerza: '#9ACD32', // Yellowish green for better visibility
  permission: '#FFA500', // Orange for better visibility in dark theme
  secondaryBorder: '#888',
  text: '#fff',
  secondaryText: '#999',
  suggestion: '#DA70D6', // Orchid purple for better contrast
  success: '#3399ff', // Bright blue instead of green
  error: '#ff6666', // Bright red for better visibility
  warning: '#ffcc00', // Yellow-orange for deuteranopia
  diff: {
    added: '#004466', // Dark blue instead of green
    removed: '#660000', // Dark red for better contrast
    addedDimmed: '#3e515b',
    removedDimmed: '#3e2c2c',
  },
}

export type ThemeNames =
  | 'dark'
  | 'light'
  | 'light-daltonized'
  | 'dark-daltonized'

export function getTheme(overrideTheme?: ThemeNames): Theme {
  const config = getGlobalConfig()
  switch (overrideTheme ?? config.theme) {
    case 'light':
      return lightTheme
    case 'light-daltonized':
      return lightDaltonizedTheme
    case 'dark-daltonized':
      return darkDaltonizedTheme
    default:
      return darkTheme
  }
}
