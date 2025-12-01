import { Text, Box } from 'ink'
import { AuthService } from '../services/auth'
import { clearMemoryCredentials } from '../utils/memoryConfig'
import { Command } from '../commands'
import * as React from 'react'

/**
 * Logout Command
 * Clears authentication token and memory credentials
 */
class LogoutCommandHandler {
  private static readonly CONFIG = {
    type: 'local-jsx' as const,
    name: 'logout',
    description: 'Log out and clear authentication',
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

  private static async executeCommand(onDone: (result?: string) => void) {
    try {
      // Clear auth token
      AuthService.clearToken()
      
      // Clear memory credentials
      clearMemoryCredentials()
      
      return (
        <Box flexDirection="column" paddingY={1}>
          <Text color="green">✓ Successfully logged out</Text>
          <Text dimColor>
            Your authentication has been cleared. Restart the CLI to login again.
          </Text>
        </Box>
      )
    } catch (error) {
      return (
        <Box flexDirection="column" paddingY={1}>
          <Text color="red">✖ Logout failed</Text>
          <Text dimColor>
            {error instanceof Error ? error.message : 'Unknown error'}
          </Text>
        </Box>
      )
    }
  }

  private static getDisplayName(): string {
    return 'logout'
  }
}

export default LogoutCommandHandler.createCommand()
