import { Command } from '../commands'
import { Box, Text } from 'ink'
import * as React from 'react'
import { getGlobalConfig, syncMultiModelConfig } from '../utils/config'
import { AuthService } from '../services/auth'
import { getTheme } from '../utils/theme'
import { BackendClient } from '../services/backend'

/**
 * Model Roles Command
 * View and sync model role assignments
 */
class ModelRolesCommandHandler {
    private static readonly CONFIG = {
        type: 'local-jsx' as const,
        name: 'model-roles',
        description: 'View and sync model role assignments',
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
        const theme = getTheme()
        const config = getGlobalConfig()

        // Check if authenticated
        if (!AuthService.isAuthenticated()) {
            return (
                <Box flexDirection="column">
                    <Text color={theme.warning}>⚠ Not authenticated</Text>
                    <Text color={theme.secondaryText}>
                        Run /login first to use multi-model features
                    </Text>
                </Box>
            )
        }

        // Sync config from backend
        try {
            await syncMultiModelConfig()
        } catch (error) {
            // Ignore errors - roles might not be configured
        }

        // Get updated config
        const updatedConfig = getGlobalConfig()

        // Fetch role assignments from backend for display
        let rolesData: any = null
        try {
            const response = await BackendClient.getMultiModelConfig()
            rolesData = response
        } catch (error) {
            // Ignore
        }

        const hasRoles = rolesData?.has_role_assignments || false
        const roles = [
            { key: 'frontend', icon: '🎨', label: 'Frontend', color: theme.info, data: rolesData?.frontend },
            { key: 'backend', icon: '⚙️', label: 'Backend', color: theme.success, data: rolesData?.backend },
            { key: 'documentation', icon: '📝', label: 'Documentation', color: theme.warning, data: rolesData?.documentation },
            { key: 'general', icon: '⚡', label: 'General', color: theme.text, data: rolesData?.general },
        ]

        return (
            <Box flexDirection="column" marginTop={1}>
                <Text color={theme.cynerza} bold>═══ Model Role Assignments ═══</Text>
                <Box marginTop={1} flexDirection="column">
                    {hasRoles ? (
                        <>
                            {roles.map(role => (
                                <Box key={role.key}>
                                    <Text color={role.color}>{role.icon} {role.label}: </Text>
                                    {role.data ? (
                                        <Text color={theme.text}>
                                            {role.data.model} ({role.data.provider})
                                        </Text>
                                    ) : (
                                        <Text color={theme.secondaryText}>Default</Text>
                                    )}
                                </Box>
                            ))}
                            <Box marginTop={1}>
                                <Text color={theme.secondaryText}>
                                    ✓ Multi-model enabled. Configure roles at your dashboard.
                                </Text>
                            </Box>
                        </>
                    ) : (
                        <Box flexDirection="column">
                            <Text color={theme.secondaryText}>
                                No role assignments configured.
                            </Text>
                            <Text color={theme.secondaryText}>
                                All tasks will use: {rolesData?.general?.model || updatedConfig.largeModelName || 'default model'}
                            </Text>
                            <Box marginTop={1}>
                                <Text color={theme.info}>
                                    💡 Configure roles in your dashboard → Model Roles
                                </Text>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>
        )
    }

    private static getDisplayName(): string {
        return 'model-roles'
    }
}

export default ModelRolesCommandHandler.createCommand()
