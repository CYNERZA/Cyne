import { Box, Text } from 'ink'
import * as React from 'react'
import { useState, useEffect } from 'react'
import { getTheme } from '../utils/theme'
import { PRODUCT_NAME } from '../constants/product'
import {
  isDefaultApiKey,
  getOpenAIApiKey,
  getGlobalConfig,
} from '../utils/config'
import { getCwd } from '../utils/state'
import type { WrappedClient } from '../services/mcpClient'
import packageJson from '../../package.json'
import os from 'os'
import { execSync } from 'child_process'
import { getHistory } from '../history'
import { getSessionState } from '../utils/sessionState'

export const MIN_LOGO_WIDTH = 50

// Premium ASCII Art Mascot
const CYNE_MASCOT = [
  '    ▄▄▄▄▄▄▄▄▄    ',
  '  ▄▀░░░░░░░░░▀▄  ',
  ' █░▄▀░░▄░▄░░▀▄░█ ',
  ' █░░░░░█░█░░░░░█ ',
  ' █░▀▄░░▀▀▀░░▄▀░█ ',
  '  ▀▄░▀▀▀▀▀▀▀░▄▀  ',
  '    ▀▀▀▀▀▀▀▀▀    ',
]

function getUsername(): string {
  return os.userInfo().username || 'Developer'
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getGitBranch(): string | null {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', {
      encoding: 'utf8',
      cwd: getCwd(),
    }).trim()
    return branch || null
  } catch {
    return null
  }
}

function getGitStatus(): { modified: number; staged: number } | null {
  try {
    const status = execSync('git status --porcelain 2>/dev/null', {
      encoding: 'utf8',
      cwd: getCwd(),
    })
    const lines = status.trim().split('\n').filter(l => l)
    const modified = lines.filter(l => l.startsWith(' M') || l.startsWith('??')).length
    const staged = lines.filter(l => l.startsWith('M ') || l.startsWith('A ')).length
    return { modified, staged }
  } catch {
    return null
  }
}

// Tips for Getting Started
const TIPS = [
  'Run `/init` to create a CYNE.md file',
  'Use `/help` for all available commands',
  'Press `Ctrl+Shift+I` to expand inputs',
]

interface LogoProps {
  mcpClients: WrappedClient[]
  isDefaultModel?: boolean
  isLoading?: boolean
  hasErrors?: boolean
}

export function Logo({
  mcpClients,
  isDefaultModel = false,
  isLoading = false,
  hasErrors = false,
}: LogoProps): React.ReactNode {
  const theme = getTheme()
  const config = getGlobalConfig()
  const currentModel = config.largeModelName || 'claude-sonnet-4-20250514'
  const apiKey = getOpenAIApiKey()
  const isCustomApiKey = !isDefaultApiKey()
  const username = getUsername()
  const greeting = getGreeting()
  const cwd = getCwd()

  // Get git info
  const gitBranch = getGitBranch()
  const gitStatus = getGitStatus()

  // Get recent history
  const recentHistory = getHistory().slice(0, 3)

  // Get streaming tokens from session state
  const streamingTokens = getSessionState('streamingTokens') || 0

  const hasOverrides = Boolean(
    isCustomApiKey ||
    process.env.DISABLE_PROMPT_CACHING ||
    process.env.API_TIMEOUT_MS ||
    process.env.MAX_THINKING_TOKENS ||
    process.env.OPENAI_BASE_URL,
  )

  return (
    <Box flexDirection="column" paddingBottom={1}>
      {/* Top Version Bar with Git Branch */}
      <Box marginBottom={1} justifyContent="space-between">
        <Box>
          <Text color={theme.cynerza} bold>
            {PRODUCT_NAME} v{packageJson.version}
          </Text>
        </Box>
        {gitBranch && (
          <Box>
            <Text color={theme.accent.secondary}>⎇ </Text>
            <Text color={theme.text} bold>{gitBranch}</Text>
            {gitStatus && (gitStatus.modified > 0 || gitStatus.staged > 0) && (
              <Text color={theme.warning}> ({gitStatus.modified}M {gitStatus.staged}S)</Text>
            )}
          </Box>
        )}
      </Box>

      {/* Main Two-Column Layout */}
      <Box flexDirection="row">
        {/* Left Panel - Greeting, Mascot, Info */}
        <Box
          flexDirection="column"
          width={42}
          paddingRight={2}
        >
          {/* Welcome Message */}
          <Box marginBottom={1}>
            <Text bold color={theme.text}>
              {greeting} {username}!
            </Text>
          </Box>

          {/* ASCII Mascot */}
          <Box flexDirection="column" marginBottom={1}>
            {CYNE_MASCOT.map((line, i) => (
              <Text key={`mascot-${i}`} color={theme.cynerza}>{line}</Text>
            ))}
          </Box>

          {/* Model and Directory */}
          <Box flexDirection="column" gap={0}>
            <Box>
              <Text color={theme.accent.secondary} bold>
                {currentModel.split('-').slice(0, 2).join(' ').replace(/^\w/, c => c.toUpperCase())}
              </Text>
              <Text color={theme.secondaryText}> · {config.primaryProvider || 'Anthropic'}</Text>
            </Box>
            <Box>
              <Text color={theme.secondaryText}>{cwd}</Text>
            </Box>

            {/* Model Roles Section */}
            {config.hasMultiModelEnabled && config.modelRoles && (
              <Box flexDirection="column" marginTop={1}>
                <Text color={theme.cynerza} bold>Model Roles</Text>
                {config.modelRoles.frontend && (
                  <Box>
                    <Text color={theme.info}>🎨 Frontend: </Text>
                    <Text color={theme.text}>{config.modelRoles.frontend.model}</Text>
                  </Box>
                )}
                {config.modelRoles.backend && (
                  <Box>
                    <Text color={theme.success}>⚙️  Backend: </Text>
                    <Text color={theme.text}>{config.modelRoles.backend.model}</Text>
                  </Box>
                )}
                {config.modelRoles.general && (
                  <Box>
                    <Text color={theme.warning}>⚡ General: </Text>
                    <Text color={theme.text}>{config.modelRoles.general.model}</Text>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>

        {/* Right Panel - Tips & Activity */}
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.secondaryText}
          borderLeft
          borderTop={false}
          borderRight={false}
          borderBottom={false}
          paddingLeft={2}
          width={45}
        >
          {/* Tips Section */}
          <Box flexDirection="column" marginBottom={1}>
            <Text color={theme.cynerza} bold>Tips for getting started</Text>
            {TIPS.map((tip, i) => (
              <Text key={`tip-${i}`} color={theme.text}>{tip}</Text>
            ))}
            {cwd === os.homedir() && (
              <Box marginTop={0}>
                <Text color={theme.warning}>
                  Note: Running in home directory
                </Text>
              </Box>
            )}
          </Box>

          {/* Recent Activity Section - REAL DATA */}
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.cynerza} bold>Recent activity</Text>
            {recentHistory.length > 0 ? (
              recentHistory.map((cmd, i) => (
                <Text key={`hist-${i}`} color={theme.secondaryText}>
                  › {cmd.length > 35 ? cmd.slice(0, 35) + '...' : cmd}
                </Text>
              ))
            ) : (
              <Text color={theme.secondaryText}>No recent activity</Text>
            )}
          </Box>

          {/* MCP Servers */}
          {mcpClients.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color={theme.cynerza} bold>MCP Servers ({mcpClients.length})</Text>
              {mcpClients.map((client) => (
                <Box key={client.name}>
                  <Text color={client.type === 'connected' ? theme.success : theme.error}>●</Text>
                  <Text color={theme.text}> {client.name}</Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Environment Overrides - Compact */}
      {hasOverrides && (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text color={theme.warning}>⚠ Env Overrides:</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            {isCustomApiKey && apiKey && (
              <Text color={theme.secondaryText}>API Key: ***{apiKey.slice(-4)}</Text>
            )}
            {process.env.OPENAI_BASE_URL && (
              <Text color={theme.secondaryText}>Base URL: Custom</Text>
            )}
            {process.env.MAX_THINKING_TOKENS && (
              <Text color={theme.secondaryText}>Think: {process.env.MAX_THINKING_TOKENS}</Text>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}
