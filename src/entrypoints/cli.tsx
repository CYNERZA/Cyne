#!/usr/bin/env -S node --no-warnings=ExperimentalWarning --enable-source-maps

/**
 * Cyne CLI Entry Point - Alternative Implementation
 * This is a complete refactoring of the CLI entry point using different patterns
 * while preserving all functionality and the Cyne/Cynerza branding
 */

// Initialize error tracking first
import { initSentry } from '../services/sentry'
import { PRODUCT_COMMAND, PRODUCT_NAME } from '../constants/product'
initSentry()

// Core framework imports with alternative patterns
import React from 'react'
import { ReadStream } from 'tty'
import { openSync, existsSync } from 'fs'
import { render, RenderOptions } from 'ink'

// Application core modules
import { REPL } from '../screens/REPL'
import { addToHistory } from '../history'
import { getContext, setContext, removeContext } from '../context'
import { Command } from '@commander-js/extra-typings'
import { ask } from '../utils/ask'

// Configuration and utilities
import { hasPermissionsToUseTool } from '../permissions'
import { getTools } from '../tools'
import {
  getGlobalConfig,
  getCurrentProjectConfig,
  saveGlobalConfig,
  saveCurrentProjectConfig,
  getCustomApiKeyStatus,
  normalizeApiKeyForConfig,
  setConfigForCLI,
  deleteConfigForCLI,
  getConfigForCLI,
  listConfigForCLI,
  enableConfigs,
} from '../utils/config.js'

// System and process utilities
import { cwd } from 'process'
import { dateToFilename, logError, parseLogFilename } from '../utils/log'

// Interface components
import { Onboarding } from '../components/Onboarding'
import { Doctor } from '../screens/Doctor'
import { ApproveApiKey } from '../components/ApproveApiKey'
import { TrustDialog } from '../components/TrustDialog'
import { LogList } from '../screens/LogList'
import { ResumeConversation } from '../screens/ResumeConversation'
import { ConfigureNpmPrefix } from '../screens/ConfigureNpmPrefix'

// Core functionality imports
import { checkHasTrustDialogAccepted } from '../utils/config'
import { isDefaultSlowAndCapableModel } from '../utils/model'
import { startMCPServer } from './mcp'

// Additional services
import { handleMcprcServerApprovals } from '../services/mcpServerApproval'
import { checkGate, initializeStatsig, logEvent } from '../services/statsig'
import { getExampleCommands } from '../utils/exampleCommands'
import { cursorShow } from 'ansi-escapes'
import { env } from '../utils/env'
import { getCwd, setCwd, setOriginalCwd } from '../utils/state'
import { omit } from 'lodash-es'
import { getCommands } from '../commands'
import { getNextAvailableLogForkNumber, loadLogList } from '../utils/log'
import { loadMessagesFromLog } from '../utils/conversationRecovery'
import { cleanupOldMessageFilesInBackground } from '../utils/cleanup'

// Tool management
import {
  handleListApprovedTools,
  handleRemoveApprovedTool,
} from '../commands/approvedTools.js'

// MCP Client integration
import {
  addMcpServer,
  getMcpServer,
  listMCPServers,
  parseEnvVars,
  removeMcpServer,
  getClients,
  ensureConfigScope,
} from '../services/mcpClient.js'

// Auto-updater functionality
import {
  getLatestVersion,
  installGlobalPackage,
  assertMinVersion,
} from '../utils/autoUpdater.js'

// Cache and logging
import { CACHE_PATHS } from '../utils/log'
import { PersistentShell } from '../utils/PersistentShell'
import { GATE_USE_EXTERNAL_UPDATER } from '../constants/betas'
import { clearTerminal } from '../utils/terminal'
import { showInvalidConfigDialog } from '../components/InvalidConfigDialog'
import { ConfigParseError } from '../utils/errors'
import { grantReadPermissionForOriginalDir } from '../utils/permissions/filesystem'
import { MACRO } from '../constants/macros'

/**
 * Alternative Implementation: Onboarding Completion
 * Same functionality, different function organization
 */
export function cynerCompleteOnboarding(): void {
  const config = getGlobalConfig()
  saveGlobalConfig({
    ...config,
    hasCompletedOnboarding: true,
    lastOnboardingVersion: MACRO.VERSION,
  })
}

/**
 * Alternative Implementation: Setup Screens with Different Architecture
 * Preserving original functionality with alternative implementation patterns
 */
async function cynerShowSetupScreens(
  dangerouslySkipPermissions?: boolean,
  print?: boolean,
): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    return
  }

  const config = getGlobalConfig()
  if (
    !config.theme ||
    !config.hasCompletedOnboarding // always show onboarding at least once
  ) {
    await clearTerminal()
    await new Promise<void>(resolve => {
      render(
        <Onboarding
          onDone={async () => {
            cynerCompleteOnboarding()
            await clearTerminal()
            resolve()
          }}
        />,
        {
          exitOnCtrlC: false,
        },
      )
    })
  }

  // In non-interactive or dangerously-skip-permissions mode, skip the trust dialog
  if (!print && !dangerouslySkipPermissions) {
    if (!checkHasTrustDialogAccepted()) {
      await new Promise<void>(resolve => {
        const onDone = () => {
          // Grant read permission to the current working directory
          grantReadPermissionForOriginalDir()
          resolve()
        }
        render(<TrustDialog onDone={onDone} />, {
          exitOnCtrlC: false,
        })
      })
    }

    // After trust dialog, check for any mcprc servers that need approval
    if (process.env.USER_TYPE === 'ant') {
      await handleMcprcServerApprovals()
    }
  }
}

/**
 * Alternative Implementation: Startup Logging
 * Same functionality with different naming pattern
 */
function cynerLogStartup(): void {
  const config = getGlobalConfig()
  saveGlobalConfig({
    ...config,
    numStartups: (config.numStartups ?? 0) + 1,
  })
}

/**
 * Alternative Implementation: Environment Setup
 * Preserving original functionality with alternative implementation structure
 */
async function cynerSetup(
  cwd: string,
  dangerouslySkipPermissions?: boolean,
): Promise<void> {
  // Set both current and original working directory if --cwd was provided
  if (cwd !== process.cwd()) {
    setOriginalCwd(cwd)
  }
  await setCwd(cwd)

  // Always grant read permissions for original working dir
  grantReadPermissionForOriginalDir()

  // If --dangerously-skip-permissions is set, verify we're in a safe environment
  if (dangerouslySkipPermissions) {
    // Check if running as root/sudo on Unix-like systems
    if (
      process.platform !== 'win32' &&
      typeof process.getuid === 'function' &&
      process.getuid() === 0
    ) {
      console.error(
        `--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons`,
      )
      process.exit(1)
    }

    // Only await if --dangerously-skip-permissions is set
    const [isDocker, hasInternet] = await Promise.all([
      env.getIsDocker(),
      env.hasInternetAccess(),
    ])

    if (!isDocker || hasInternet) {
      console.error(
        `--dangerously-skip-permissions can only be used in Docker containers with no internet access but got Docker: ${isDocker} and hasInternet: ${hasInternet}`,
      )
      process.exit(1)
    }
  }

  if (process.env.NODE_ENV === 'test') {
    return
  }

  cleanupOldMessageFilesInBackground()
  getContext() // Pre-fetch all context data at once

  // Migrate old iterm2KeyBindingInstalled config to new shiftEnterKeyBindingInstalled
  const globalConfig = getGlobalConfig()
  if (
    globalConfig.iterm2KeyBindingInstalled === true &&
    globalConfig.shiftEnterKeyBindingInstalled !== true
  ) {
    const updatedConfig = {
      ...globalConfig,
      shiftEnterKeyBindingInstalled: true,
    }
    // Remove the old config property
    delete updatedConfig.iterm2KeyBindingInstalled
    saveGlobalConfig(updatedConfig)
  }

  // Check for last session's cost and duration
  const projectConfig = getCurrentProjectConfig()
  if (
    projectConfig.lastCost !== undefined &&
    projectConfig.lastDuration !== undefined
  ) {
    logEvent('cyner_exit', {
      last_session_cost: String(projectConfig.lastCost),
      last_session_api_duration: String(projectConfig.lastAPIDuration),
      last_session_duration: String(projectConfig.lastDuration),
      last_session_id: projectConfig.lastSessionId,
    })
  }
}

/**
 * Alternative Implementation: Main Function
 * Preserving original flow with different implementation approach
 */
async function cynerMain() {
  // Validate configs are valid and enable configuration system
  try {
    enableConfigs()
  } catch (error: unknown) {
    if (error instanceof ConfigParseError) {
      // Show the invalid config dialog with the error object
      await showInvalidConfigDialog({ error })
      return // Exit after handling the config error
    }
  }

  let inputPrompt = ''
  let renderContext: RenderOptions | undefined = {
    exitOnCtrlC: false,
  }

  if (
    !process.stdin.isTTY &&
    !process.env.CI &&
    // Input hijacking breaks MCP.
    !process.argv.includes('mcp')
  ) {
    inputPrompt = await cynerStdin()
    if (process.platform !== 'win32') {
      try {
        const ttyFd = openSync('/dev/tty', 'r')
        renderContext = { ...renderContext, stdin: new ReadStream(ttyFd) }
      } catch (err) {
        logError(`Could not open /dev/tty: ${err}`)
      }
    }
  }
  await cynerParseArgs(inputPrompt, renderContext)
}

/**
 * Alternative Implementation: Argument Parsing
 * Preserving original flow with different implementation approach using Commander.js
 */
async function cynerParseArgs(
  stdinContent: string,
  renderContext: RenderOptions | undefined,
): Promise<Command> {
  const program = new Command()

  const renderContextWithExitOnCtrlC = {
    ...renderContext,
    exitOnCtrlC: true,
  }

  // Get the initial list of commands filtering based on user type
  const commands = await getCommands()

  // Format command list for help text (using same filter as in help.ts)
  const commandList = commands
    .filter(cmd => !cmd.isHidden)
    .map(cmd => `/${cmd.name} - ${cmd.description}`)
    .join('\n')

  program
    .name(PRODUCT_COMMAND)
    .description(
      `${PRODUCT_NAME} - starts an interactive session by default, use -p/--print for non-interactive output

Slash commands available during an interactive session:
${commandList}`,
    )
    .argument('[prompt]', 'Your prompt', String)
    .option('-c, --cwd <cwd>', 'The current working directory', String, cwd())
    .option('-d, --debug', 'Enable debug mode', () => true)
    .option(
      '--verbose',
      'Override verbose mode setting from config',
      () => true,
    )
    .option('-e, --enable-architect', 'Enable the Architect tool', () => true)
    .option(
      '-p, --print',
      'Print response and exit (useful for pipes)',
      () => true,
    )
    .option(
      '--dangerously-skip-permissions',
      'Skip all permission checks. Only works in Docker containers with no internet access. Will crash otherwise.',
      () => true,
    )
    .action(
      async (
        prompt,
        {
          cwd,
          debug,
          verbose,
          enableArchitect,
          print,
          dangerouslySkipPermissions,
        },
      ) => {
        await cynerShowSetupScreens(dangerouslySkipPermissions, print)
        logEvent('cyner_init', {
          entrypoint: PRODUCT_COMMAND,
          hasInitialPrompt: Boolean(prompt).toString(),
          hasStdin: Boolean(stdinContent).toString(),
          enableArchitect: enableArchitect?.toString() ?? 'false',
          verbose: verbose?.toString() ?? 'false',
          debug: debug?.toString() ?? 'false',
          print: print?.toString() ?? 'false',
        })
        await cynerSetup(cwd, dangerouslySkipPermissions)

        assertMinVersion()

        const [tools, mcpClients] = await Promise.all([
          getTools(
            enableArchitect ?? getCurrentProjectConfig().enableArchitectTool,
          ),
          getClients(),
        ])
        cynerLogStartup()
        const inputPrompt = [prompt, stdinContent].filter(Boolean).join('\n')
        if (print) {
          if (!inputPrompt) {
            console.error(
              'Error: Input must be provided either through stdin or as a prompt argument when using --print',
            )
            process.exit(1)
          }

          addToHistory(inputPrompt)
          const { resultText: response } = await ask({
            commands,
            hasPermissionsToUseTool,
            messageLogName: dateToFilename(new Date()),
            prompt: inputPrompt,
            cwd,
            tools,
            dangerouslySkipPermissions,
          })
          console.log(response)
          process.exit(0)
        } else {
          const isDefaultModel = await isDefaultSlowAndCapableModel()

          render(
            <REPL
              commands={commands}
              debug={debug}
              initialPrompt={inputPrompt}
              messageLogName={dateToFilename(new Date())}
              shouldShowPromptInput={true}
              verbose={verbose}
              tools={tools}
              dangerouslySkipPermissions={dangerouslySkipPermissions}
              mcpClients={mcpClients}
              isDefaultModel={isDefaultModel}
            />,
            renderContext,
          )
        }
      },
    )
    .version(MACRO.VERSION, '-v, --version')

  await program.parseAsync(process.argv)
  return program
}

/**
 * Alternative Implementation: Stdin Input Handler
 * Same functionality with different naming pattern
 */
async function cynerStdin() {
  if (process.stdin.isTTY) {
    return ''
  }

  let data = ''
  for await (const chunk of process.stdin) data += chunk
  return data
}

/**
 * Alternative Implementation: Process Cleanup
 * Same functionality with different naming pattern
 */
function cynerResetCursor() {
  const terminal = process.stderr.isTTY
    ? process.stderr
    : process.stdout.isTTY
      ? process.stdout
      : undefined
  terminal?.write(`\u001B[?25h${cursorShow}`)
}

/**
 * Alternative Implementation: Process Event Handlers
 * Same functionality with different organization
 */
process.on('exit', () => {
  cynerResetCursor()
  PersistentShell.getInstance().close()
})

process.on('SIGINT', () => {
  console.log('SIGINT')
  process.exit(0)
})

// Alternative entry point with same functionality
cynerMain()
