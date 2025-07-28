import React from 'react'
import { Box, Text, useInput } from 'ink'
import { getTheme } from '../utils/theme'
import { Select } from '@inkjs/ui'
import {
  saveCurrentProjectConfig,
  getCurrentProjectConfig,
} from '../utils/config.js'
import { MCPServerDialogCopy } from './MCPServerDialogCopy'
import { useExitOnCtrlCD } from '../hooks/useExitOnCtrlCD'

type Props = {
  serverName: string
  onDone(): void
}

// Enhanced Configuration Management Service
class MCPServerApprovalConfigurationManager {
  private static instance: MCPServerApprovalConfigurationManager
  
  static getInstance(): MCPServerApprovalConfigurationManager {
    if (!this.instance) {
      this.instance = new MCPServerApprovalConfigurationManager()
    }
    return this.instance
  }

  getSelectOptions() {
    return [
      { label: 'Yes, approve this server', value: 'yes' },
      { label: 'No, reject this server', value: 'no' },
    ]
  }

  validateServerName(serverName: string): boolean {
    return typeof serverName === 'string' && serverName.trim().length > 0
  }

  getThemeSettings() {
    const theme = getTheme()
    return {
      warning: theme.warning,
      dimColor: 'dimColor'
    }
  }
}

// Server Configuration Processing Service
class MCPServerConfigurationProcessorService {
  private static instance: MCPServerConfigurationProcessorService
  
  static getInstance(): MCPServerConfigurationProcessorService {
    if (!this.instance) {
      this.instance = new MCPServerConfigurationProcessorService()
    }
    return this.instance
  }

  processApproval(serverName: string): void {
    try {
      const config = getCurrentProjectConfig()
      if (!config.approvedMcprcServers) {
        config.approvedMcprcServers = []
      }
      if (!config.approvedMcprcServers.includes(serverName)) {
        config.approvedMcprcServers.push(serverName)
      }
      saveCurrentProjectConfig(config)
    } catch (error) {
      console.error('Error processing server approval:', error)
      throw new Error('Failed to approve server')
    }
  }

  processRejection(serverName: string): void {
    try {
      const config = getCurrentProjectConfig()
      if (!config.rejectedMcprcServers) {
        config.rejectedMcprcServers = []
      }
      if (!config.rejectedMcprcServers.includes(serverName)) {
        config.rejectedMcprcServers.push(serverName)
      }
      saveCurrentProjectConfig(config)
    } catch (error) {
      console.error('Error processing server rejection:', error)
      throw new Error('Failed to reject server')
    }
  }

  validateCallback(onDone: () => void): boolean {
    return typeof onDone === 'function'
  }
}

// Dialog Rendering Service
class MCPServerApprovalRenderingService {
  private configManager: MCPServerApprovalConfigurationManager
  private processorService: MCPServerConfigurationProcessorService

  constructor(
    configManager: MCPServerApprovalConfigurationManager,
    processorService: MCPServerConfigurationProcessorService
  ) {
    this.configManager = configManager
    this.processorService = processorService
  }

  static create(): MCPServerApprovalRenderingService {
    return new MCPServerApprovalRenderingService(
      MCPServerApprovalConfigurationManager.getInstance(),
      MCPServerConfigurationProcessorService.getInstance()
    )
  }

  renderApprovalDialog(
    serverName: string,
    onChange: (value: 'yes' | 'no') => void,
    exitState: any
  ) {
    const theme = this.configManager.getThemeSettings()
    const options = this.configManager.getSelectOptions()

    if (!this.configManager.validateServerName(serverName)) {
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="red">Error: Invalid server name</Text>
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
            New MCP Server Detected
          </Text>
          <Text>
            This project contains a .mcprc file with an MCP server that requires
            your approval:
          </Text>
          <Text bold>{serverName}</Text>

          <MCPServerDialogCopy />

          <Text>Do you want to approve this MCP server?</Text>

          <Select
            options={options}
            onChange={onChange}
          />
        </Box>
        <Box marginLeft={3}>
          <Text dimColor>
            {exitState.pending ? (
              <>Press {exitState.keyName} again to exit</>
            ) : (
              <>Enter to confirm · Esc to reject</>
            )}
          </Text>
        </Box>
      </>
    )
  }
}

export function MCPServerApprovalDialog({
  serverName,
  onDone,
}: Props): React.ReactNode {
  const configManager = MCPServerApprovalConfigurationManager.getInstance()
  const processorService = MCPServerConfigurationProcessorService.getInstance()
  const renderingService = MCPServerApprovalRenderingService.create()

  function onChange(value: 'yes' | 'no') {
    try {
      switch (value) {
        case 'yes': {
          processorService.processApproval(serverName)
          onDone()
          break
        }
        case 'no': {
          processorService.processRejection(serverName)
          onDone()
          break
        }
      }
    } catch (error) {
      console.error('Error handling server approval:', error)
      onDone() // Exit on error
    }
  }

  const exitState = useExitOnCtrlCD(() => process.exit(0))

  useInput((_input, key) => {
    if (key.escape) {
      onDone()
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

  return renderingService.renderApprovalDialog(serverName, onChange, exitState)
}
