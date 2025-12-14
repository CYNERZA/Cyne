import { Command } from '../commands'
import * as React from 'react'
import { useState } from 'react'
import { Box, Text } from 'ink'
import { Select } from '@inkjs/ui'
import { getGlobalConfig, saveGlobalConfig } from '../utils/config'
import { ThemeNames, getTheme } from '../utils/theme'
import { getIcons } from '../utils/fonts'

/**
 * Theme Selector Command - /theme
 * Interactive theme selection with arrow keys
 */

const AVAILABLE_THEMES: { label: string; value: ThemeNames }[] = [
  { label: 'Dark (Default)', value: 'dark' },
  { label: 'Light', value: 'light' },
  { label: 'Dracula (Purple)', value: 'dracula' },
  { label: 'Monokai (Vibrant)', value: 'monokai' },
  { label: 'Red (Crimson)', value: 'red' },
  { label: 'Dark (Colorblind)', value: 'dark-daltonized' },
  { label: 'Light (Colorblind)', value: 'light-daltonized' },
]

interface ThemeSelectorProps {
  onDone: (result?: string) => void
}

function ThemeSelector({ onDone }: ThemeSelectorProps): React.ReactNode {
  const config = getGlobalConfig()
  const currentTheme = config.theme || 'dark'
  const [selected, setSelected] = useState(false)
  const icons = getIcons()

  const handleSelect = (value: string) => {
    const themeName = value as ThemeNames

    if (themeName === currentTheme) {
      onDone(`${icons.check} Already using "${themeName}" theme`)
      return
    }

    // Save the new theme
    saveGlobalConfig({
      ...config,
      theme: themeName,
    })

    setSelected(true)
    onDone(`${icons.check} Theme changed to "${themeName}"\n\nRestart Cyne to apply the theme.`)
  }

  if (selected) {
    return null
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="#9ACD32">{icons.palette} Theme Selector</Text>
      </Box>
      <Box marginBottom={1}>
        <Text dimColor>Current: </Text>
        <Text bold color="#9ACD32">{currentTheme}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text dimColor>Use {icons.arrowDown} arrows to navigate, Enter to select</Text>
      </Box>
      <Select
        options={AVAILABLE_THEMES}
        onChange={handleSelect}
      />
    </Box>
  )
}

class ThemeCommandHandler {
  private static readonly CONFIG = {
    type: 'local-jsx' as const,
    name: 'theme',
    description: 'Switch between color themes',
    isEnabled: true,
    isHidden: false,
  }

  static createCommand(): Command {
    return {
      ...this.CONFIG,
      call: this.executeCommand,
      userFacingName: this.getDisplayName,
    }
  }

  private static async executeCommand(
    onDone: (result?: string) => void,
    context: any,
  ): Promise<React.ReactNode> {
    return <ThemeSelector onDone={onDone} />
  }

  private static getDisplayName(): string {
    return 'theme'
  }
}

export default ThemeCommandHandler.createCommand()

