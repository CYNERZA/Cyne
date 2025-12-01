import { Command } from '../commands'
import Login from '../components/Login.js'
import * as React from 'react'
import { TelemetryClient } from '../services/telemetry'
import { AuthService } from '../services/auth'

/**
 * Login Command
 * Handles device flow authentication
 */
class LoginCommandHandler {
  private static readonly CONFIG = {
    type: 'local-jsx' as const,
    name: 'login',
    description: 'Authenticate with Cyne backend',
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
  ) {
    // Initialize telemetry
    const userInfo = AuthService.getUserInfo()
    if (userInfo) {
      await TelemetryClient.init(userInfo.id)
    }

    return (
      <Login
        onComplete={async () => {
          // Track successful login
          TelemetryClient.trackEvent('user_logged_in', {
            method: 'device_flow',
          })
          TelemetryClient.flushEvents()

          // Sync config from backend (will auto-enable backend models)
          const { syncConfigFromBackend } = await import('../utils/config')
          await syncConfigFromBackend()

          onDone('Successfully authenticated! Your models have been synced from the backend.')
        }}
      />
    )
  }

  private static getDisplayName(): string {
    return 'login'
  }
}

export default LoginCommandHandler.createCommand()

