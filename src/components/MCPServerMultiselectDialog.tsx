import React from 'react'
import { Box, Text, useInput } from 'ink'
import { getTheme } from '../utils/theme'
import { MultiSelect } from '@inkjs/ui'
import {
  saveCurrentProjectConfig,
  getCurrentProjectConfig,
} from '../utils/config.js'
import { partition } from 'lodash-es'
import { MCPServerDialogCopy } from './MCPServerDialogCopy'
import { useExitOnCtrlCD } from '../hooks/useExitOnCtrlCD'

type Props = {
  serverNames: string[]
  onDone(): void
}

// Enhanced Configuration Management Service
class MCPServerMultiselectConfigurationManager {
  private static instance: MCPServerMultiselectConfigurationManager
  
  static getInstance(): MCPServerMultiselectConfigurationManager {
    if (!this.instance) {
      this.instance = new MCPServerMultiselectConfigurationManager()
    }
    return this.instance
  }

  convertServersToOptions(serverNames: string[]) {
    return serverNames.map(server => ({
      label: server,
      value: server,
    }))
  }

  validateServerNames(serverNames: string[]): boolean {
    return Array.isArray(serverNames) && serverNames.length > 0 && 
           serverNames.every(server => typeof server === 'string' && server.trim().length > 0)
  }

  getThemeSettings() {
    const theme = getTheme()
    return {
      warning: theme.warning,
      dimColor: 'dimColor'
    }
  }
}

// Server Selection Processing Service
class MCPServerMultiselectProcessorService {
  private static instance: MCPServerMultiselectProcessorService
  
  static getInstance(): MCPServerMultiselectProcessorService {
    if (!this.instance) {
      this.instance = new MCPServerMultiselectProcessorService()
    }
    return this.instance
  }

  partitionServers(serverNames: string[], selectedServers: string[]) {
    try {
      return partition(serverNames, server => selectedServers.includes(server))
    } catch (error) {
      console.error('Error partitioning servers:', error)
      return [[], serverNames] // Default to rejecting all on error
    }
  }

  processServerConfiguration(serverNames: string[], selectedServers: string[]): void {
    try {
      const config = getCurrentProjectConfig()

      // Initialize arrays if they don't exist
      if (!config.approvedMcprcServers) {
        config.approvedMcprcServers = []
      }
      if (!config.rejectedMcprcServers) {
        config.rejectedMcprcServers = []
      }

      // Use partition to separate approved and rejected servers
      const [approvedServers, rejectedServers] = this.partitionServers(serverNames, selectedServers)

      // Add new servers directly to the respective lists
      config.approvedMcprcServers.push(...approvedServers)
      config.rejectedMcprcServers.push(...rejectedServers)

      saveCurrentProjectConfig(config)
    } catch (error) {
      console.error('Error processing server configuration:', error)
      throw new Error('Failed to save server configuration')
    }
  }

  processRejectAll(serverNames: string[]): void {
    try {
      const config = getCurrentProjectConfig()
      if (!config.rejectedMcprcServers) {
        config.rejectedMcprcServers = []
      }

      for (const server of serverNames) {
        if (!config.rejectedMcprcServers.includes(server)) {
          config.rejectedMcprcServers.push(server)
        }
      }

      saveCurrentProjectConfig(config)
    } catch (error) {
      console.error('Error rejecting all servers:', error)
      throw new Error('Failed to reject all servers')
    }
  }

  validateCallback(onDone: () => void): boolean {
    return typeof onDone === 'function'
  }
}

// Dialog Rendering Service
class MCPServerMultiselectRenderingService {
  private configManager: MCPServerMultiselectConfigurationManager
  private processorService: MCPServerMultiselectProcessorService

  constructor(
    configManager: MCPServerMultiselectConfigurationManager,
    processorService: MCPServerMultiselectProcessorService
  ) {
    this.configManager = configManager
    this.processorService = processorService
  }

  static create(): MCPServerMultiselectRenderingService {
    return new MCPServerMultiselectRenderingService(
      MCPServerMultiselectConfigurationManager.getInstance(),
      MCPServerMultiselectProcessorService.getInstance()
    )
  }

  renderMultiselectDialog(
    serverNames: string[],
    onSubmit: (selectedServers: string[]) => void,
    exitState: any
  ) {
    const theme = this.configManager.getThemeSettings()
    const options = this.configManager.convertServersToOptions(serverNames)

    if (!this.configManager.validateServerNames(serverNames)) {
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="red">Error: Invalid server names list</Text>
        </Box>
      )
    }

    return (
      <>
        <Box
          flexDirection="column"
          gap={1}
          padding={1}
          borderStyle="round"
          borderColor={theme.warning}
        >
          <Text bold color={theme.warning}>
            New MCP Servers Detected
          </Text>
          <Text>
            This project contains a .mcprc file with {serverNames.length} MCP
            servers that require your approval.
          </Text>
          <MCPServerDialogCopy />

          <Text>Please select the servers you want to enable:</Text>

          <MultiSelect
            options={options}
            defaultValue={serverNames}
            onSubmit={onSubmit}
          />
        </Box>
        <Box marginLeft={3}>
          <Text dimColor>
            {exitState.pending ? (
              <>Press {exitState.keyName} again to exit</>
            ) : (
              <>Space to select · Enter to confirm · Esc to reject all</>
            )}
          </Text>
        </Box>
      </>
    )
  }
}

export function MCPServerMultiselectDialog({
  serverNames,
  onDone,
}: Props): React.ReactNode {
  const configManager = MCPServerMultiselectConfigurationManager.getInstance()
  const processorService = MCPServerMultiselectProcessorService.getInstance()
  const renderingService = MCPServerMultiselectRenderingService.create()

  function onSubmit(selectedServers: string[]) {
    try {
      processorService.processServerConfiguration(serverNames, selectedServers)
      onDone()
    } catch (error) {
      console.error('Error submitting server selection:', error)
      onDone() // Exit on error
    }
  }

  const exitState = useExitOnCtrlCD(() => process.exit())

  useInput((_input, key) => {
    if (key.escape) {
      try {
        processorService.processRejectAll(serverNames)
        onDone()
      } catch (error) {
        console.error('Error handling escape:', error)
        onDone()
      }
      return
    }
  })

  if (!processorService.validateCallback(onDone)) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="red">Error: Invalid callback function</Text>
      </Box>
    )
  }

  return renderingService.renderMultiselectDialog(serverNames, onSubmit, exitState)
}
