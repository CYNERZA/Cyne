import type { Command } from '../commands'
import * as React from 'react'
import { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import { isNerdFontInstalled, installNerdFonts, NERD_ICONS, UNICODE_ICONS } from '../utils/fonts'

/**
 * Fonts Command - /fonts
 * Check and install Nerd Fonts for premium icons
 */

interface FontsInstallerProps {
  onDone: (result?: string) => void
}

function FontsInstaller({ onDone }: FontsInstallerProps): React.ReactNode {
  const [status, setStatus] = useState<'checking' | 'installed' | 'installing' | 'done' | 'error'>('checking')
  const [message, setMessage] = useState('Checking for Nerd Fonts...')
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    const check = async () => {
      const hasNerdFonts = isNerdFontInstalled()
      
      if (hasNerdFonts) {
        setStatus('installed')
        setMessage('✓ Nerd Fonts already installed!')
        setTimeout(() => {
          onDone('Nerd Fonts are already installed. You have access to premium icons!')
        }, 1500)
      } else {
        setStatus('installing')
        setMessage('Installing Nerd Fonts...')
        
        const success = await installNerdFonts((log) => {
          setLogs(prev => [...prev, log])
        })
        
        if (success) {
          setStatus('done')
          setMessage('✓ Nerd Fonts installed successfully!')
          setTimeout(() => {
            onDone('Nerd Fonts installed! Restart your terminal to use premium icons.')
          }, 2000)
        } else {
          setStatus('error')
          setMessage('✗ Failed to install Nerd Fonts')
          setTimeout(() => {
            onDone('Failed to install Nerd Fonts. Please install manually.')
          }, 2000)
        }
      }
    }
    
    check()
  }, [onDone])

  const hasNerdFonts = status === 'installed'
  
  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="#9ACD32">🔤 Font Manager</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color={status === 'error' ? '#ff4757' : status === 'done' || status === 'installed' ? '#50fa7b' : '#9ACD32'}>
          {message}
        </Text>
      </Box>
      
      {logs.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {logs.slice(-5).map((log, i) => (
            <Text key={i} dimColor>{log}</Text>
          ))}
        </Box>
      )}
      
      {hasNerdFonts && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="#9ACD32">Available Icons:</Text>
          <Box marginTop={1} gap={2}>
            <Text>
              <Text color="#50fa7b">{NERD_ICONS.success}</Text> success  
              <Text color="#ff4757">{NERD_ICONS.error}</Text> error  
              <Text color="#ffa502">{NERD_ICONS.warning}</Text> warning  
              <Text color="#3b82f6">{NERD_ICONS.info}</Text> info
            </Text>
          </Box>
          <Box gap={2}>
            <Text>
              <Text color="#9ACD32">{NERD_ICONS.git}</Text> git  
              <Text color="#9ACD32">{NERD_ICONS.folder}</Text> folder  
              <Text color="#9ACD32">{NERD_ICONS.terminal}</Text> terminal  
              <Text color="#9ACD32">{NERD_ICONS.cog}</Text> settings
            </Text>
          </Box>
        </Box>
      )}
      
      {!hasNerdFonts && status !== 'installing' && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Fallback Unicode icons will be used instead:</Text>
          <Box marginTop={1}>
            <Text>
              {UNICODE_ICONS.success} success  
              {UNICODE_ICONS.error} error  
              {UNICODE_ICONS.warning} warning  
              {UNICODE_ICONS.folder} folder
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}

class FontsCommandHandler {
  private static readonly CONFIG = {
    type: 'local-jsx' as const,
    name: 'fonts',
    description: 'Install Nerd Fonts for premium icons',
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
    return <FontsInstaller onDone={onDone} />
  }

  private static getDisplayName(): string {
    return 'fonts'
  }
}

export default FontsCommandHandler.createCommand()
