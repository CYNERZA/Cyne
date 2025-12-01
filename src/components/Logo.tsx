import { Box, Text } from 'ink'
import * as React from 'react'
import { getTheme } from '../utils/theme'
import { PRODUCT_NAME } from '../constants/product'
import {
  isDefaultApiKey,
  getOpenAIApiKey,
  getGlobalConfig,
} from '../utils/config'
import { getCwd } from '../utils/state'
import { AnimatedLogo } from './AnimatedLogo'
import type { WrappedClient } from '../services/mcpClient'
import packageJson from '../../package.json'

export const MIN_LOGO_WIDTH = 50

export function Logo({
  mcpClients,
  isDefaultModel = false,
  isLoading = false,
  hasErrors = false,
}: {
  mcpClients: WrappedClient[]
  isDefaultModel?: boolean
  isLoading?: boolean
  hasErrors?: boolean
}): React.ReactNode {
  const width = Math.max(MIN_LOGO_WIDTH, getCwd().length + 12)
  const theme = getTheme()
  const config = getGlobalConfig()
  const currentModel =
    config.largeModelName &&
    (config.largeModelName === config.smallModelName
      ? config.largeModelName
      : config.largeModelName + ' | ' + config.smallModelName)
  const apiKey = getOpenAIApiKey()
  const isCustomApiKey = !isDefaultApiKey()
  const hasOverrides = Boolean(
    isCustomApiKey ||
      process.env.DISABLE_PROMPT_CACHING ||
      process.env.API_TIMEOUT_MS ||
      process.env.MAX_THINKING_TOKENS ||
      process.env.OPENAI_BASE_URL,
  )

  // Determine logo state based on activity
  const logoState = hasErrors ? 'error' : isLoading ? 'active' : 'idle'

  return (
    <Box flexDirection="column" paddingBottom={1}>
      {/* Beautiful header box with gradient border effect */}
      <Box 
        flexDirection="column" 
        borderStyle="double" 
        borderColor={logoState === 'active' ? 'cyan' : logoState === 'error' ? 'red' : 'magenta'}
        paddingX={2}
        paddingY={1}
      >
        {/* Animated Logo Banner - CENTER OF ATTENTION */}
        <Box justifyContent="center" flexDirection="column">
          <AnimatedLogo state={logoState} size="small" />
        </Box>
        
        {/* Subtitle with better styling */}
        <Box justifyContent="center" marginTop={1}>
          <Text color={theme.accent.secondary} italic bold>
            ⚡ AI Development Suite ⚡
          </Text>
        </Box>

        {/* Version with accent color */}
        <Box justifyContent="center">
          <Text color={theme.accent.primary}>
            v{packageJson.version}
          </Text>
        </Box>

        {/* Divider line */}
        <Box marginY={1} justifyContent="center">
          <Text color={theme.accent.primary}>{'─'.repeat(40)}</Text>
        </Box>

        {/* Status Information - More compact and beautiful */}
        <Box flexDirection="column" gap={0}>
          <Box>
            <Text color={theme.accent.primary}>●</Text>
            <Text color={theme.secondaryText}> Type </Text>
            <Text color={theme.accent.secondary} bold>/help</Text>
            <Text color={theme.secondaryText}> for commands</Text>
          </Box>
          
          <Box>
            <Text color={theme.accent.primary}>●</Text>
            <Text color={theme.secondaryText}> Directory: </Text>
            <Text color={theme.text} bold>{getCwd()}</Text>
          </Box>
          
          {currentModel && (
            <Box>
              <Text color={theme.accent.primary}>●</Text>
              <Text color={theme.secondaryText}> Model: </Text>
              <Text color={theme.accent.secondary} bold>{currentModel}</Text>
            </Box>
          )}

          {/* MCP Servers - Inline and compact */}
          {mcpClients.length > 0 && (
            <Box>
              <Text color={theme.accent.primary}>●</Text>
              <Text color={theme.secondaryText}> MCP ({mcpClients.length}): </Text>
              {mcpClients.map((client, idx) => (
                <Box key={client.name} flexDirection="row">
                  <Text color={client.type === 'connected' ? theme.success : theme.error}>
                    {client.name}
                  </Text>
                  {idx < mcpClients.length - 1 && <Text color={theme.secondaryText}>, </Text>}
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Environment Overrides - More compact */}
        {hasOverrides && (
          <Box flexDirection="column" marginTop={1}>
            <Box marginBottom={0}>
              <Text color={theme.warning}>⚠ Env Overrides:</Text>
            </Box>
            {isCustomApiKey && apiKey && (
              <Box>
                <Text color={theme.secondaryText}>  • API Key: </Text>
                <Text bold>***{apiKey.slice(-4)}</Text>
              </Box>
            )}
            {process.env.DISABLE_PROMPT_CACHING && (
              <Box>
                <Text color={theme.secondaryText}>  • Caching: </Text>
                <Text color={theme.error} bold>OFF</Text>
              </Box>
            )}
            {process.env.MAX_THINKING_TOKENS && (
              <Box>
                <Text color={theme.secondaryText}>  • Think Tokens: </Text>
                <Text bold>{process.env.MAX_THINKING_TOKENS}</Text>
              </Box>
            )}
            {process.env.API_TIMEOUT_MS && (
              <Box>
                <Text color={theme.secondaryText}>  • API Timeout: </Text>
                <Text bold>{process.env.API_TIMEOUT_MS}ms</Text>
              </Box>
            )}
            {process.env.OPENAI_BASE_URL && (
              <Box>
                <Text color={theme.secondaryText}>  • Base URL: </Text>
                <Text bold>{process.env.OPENAI_BASE_URL}</Text>
              </Box>
            )}
          </Box>
        )}

        {/* Enhanced Footer with status indicator */}
        <Box marginTop={1} justifyContent="center">
          <Text color={theme.secondaryText} italic>
            {logoState === 'active' ? '🔄 ' : logoState === 'error' ? '⚠ ' : '✓ '}
            {logoState === 'active' ? 'Processing...' : logoState === 'error' ? 'Error occurred' : 'Ready for development'}
            <Text color={theme.accent.primary}> • </Text>
            Press <Text color={theme.accent.secondary}>Ctrl+C</Text> to exit
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
