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
import { AsciiLogo } from './AsciiLogo'
import type { WrappedClient } from '../services/mcpClient'
import packageJson from '../../package.json'

export const MIN_LOGO_WIDTH = 50

export function Logo({
  mcpClients,
  isDefaultModel = false,
}: {
  mcpClients: WrappedClient[]
  isDefaultModel?: boolean
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
      process.env.MAX_THINKING_TOKENS,
  )

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" gap={0}>
        {/* ASCII Banner from constants */}
        <Box justifyContent="center" flexDirection="column">
          <AsciiLogo />
        </Box>
        
        {/* Subtitle */}
        <Box justifyContent="center">
          <Text color={theme.secondaryText} italic>
            AI Development Suite
          </Text>
        </Box>
        
        {/* Version */}
        <Box justifyContent="center">
          <Text color={theme.cynerza} bold>
            v{packageJson.version}
          </Text>
        </Box>

        {/* Status Information */}
        <Box paddingLeft={2} flexDirection="column" gap={0}>
          <Text>
            <Text color={theme.cynerza}>◉</Text>
            <Text color={theme.secondaryText} italic> Type /help for commands</Text>
          </Text>
          <Text>
            <Text color={theme.cynerza}>◎</Text>
            <Text color={theme.secondaryText}> Working Directory: </Text>
            <Text color={theme.text} bold>{getCwd()}</Text>
          </Text>
          {currentModel && (
            <Text>
              <Text color={theme.cynerza}>○</Text>
              <Text color={theme.secondaryText}> Active Model: </Text>
              <Text color={theme.cynerza} bold>{currentModel}</Text>
            </Text>
          )}
        </Box>

        {/* Environment Overrides Section */}
        {hasOverrides && (
          <Box
            flexDirection="column"
            marginLeft={2}
          >
            <Box>
              <Text color={theme.secondaryText}>◉ Environment Overrides:</Text>
            </Box>
            {isCustomApiKey && apiKey ? (
              <Text color={theme.secondaryText}>
                ○ Custom API Key:{' '}
                <Text bold>***...{apiKey!.slice(-8)}</Text>
              </Text>
            ) : null}
            {process.env.DISABLE_PROMPT_CACHING ? (
              <Text color={theme.secondaryText}>
                ○ Prompt Caching:{' '}
                <Text color={theme.error} bold>
                  DISABLED
                </Text>
              </Text>
            ) : null}
            {process.env.API_TIMEOUT_MS ? (
              <Text color={theme.secondaryText}>
                ○ API Timeout:{' '}
                <Text bold>{process.env.API_TIMEOUT_MS}ms</Text>
              </Text>
            ) : null}
            {process.env.MAX_THINKING_TOKENS ? (
              <Text color={theme.secondaryText}>
                ○ Max Thinking Tokens:{' '}
                <Text bold>{process.env.MAX_THINKING_TOKENS}</Text>
              </Text>
            ) : null}
            {process.env.OPENAI_BASE_URL ? (
              <Text color={theme.secondaryText}>
                ○ Custom Base URL:{' '}
                <Text bold>{process.env.OPENAI_BASE_URL}</Text>
              </Text>
            ) : null}
          </Box>
        )}
        
        {/* MCP Servers Section */}
        {mcpClients.length ? (
          <Box
            flexDirection="column"
            marginLeft={2}
            paddingTop={1}
          >
            <Box marginBottom={1}>
              <Text color={theme.secondaryText}>◎ MCP Servers ({mcpClients.length}):</Text>
            </Box>
            {mcpClients.map(client => (
              <Box key={client.name}>
                <Text color={theme.secondaryText}>
                  ○ {client.name}:{' '}
                </Text>
                <Text
                  bold
                  color={
                    client.type === 'connected' ? theme.success : theme.error
                  }
                >
                  {client.type === 'connected' ? '✓ CONNECTED' : '✗ FAILED'}
                </Text>
              </Box>
            ))}
          </Box>
        ) : null}
        
        {/* Clean Footer */}
        <Box paddingTop={2} justifyContent="center">
          <Text color={theme.secondaryText} italic>
            Ready for AI-powered development • Press Ctrl+C to exit
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
