/**
 * Model Selector - Selects appropriate model based on task category
 * 
 * Works with TaskCategorizer to pick the right AI model
 * (frontend/backend/general) based on the detected task type.
 */

import { TaskCategorizer, TaskCategory, getTaskCategorizer } from './TaskCategorizer'
import { getGlobalConfig, ProviderType } from '../utils/config'
import {
    getMemoryApiKey,
    getMemoryBaseURL,
    hasMemoryCredentials,
} from '../utils/memoryConfig'

// ============================================================================
// Types
// ============================================================================

export type ModelRole = 'frontend' | 'backend' | 'documentation' | 'general'

export interface RoleModelConfig {
    provider: ProviderType
    model: string
    apiKey: string
    baseURL?: string
}

export interface ModelRoleAssignments {
    frontend?: RoleModelConfig
    backend?: RoleModelConfig
    documentation?: RoleModelConfig
    general: RoleModelConfig // Always present as fallback
}

// ============================================================================
// Model Selector Class
// ============================================================================

export class ModelSelector {
    private categorizer: TaskCategorizer
    private roleAssignments: ModelRoleAssignments | null = null

    constructor() {
        this.categorizer = getTaskCategorizer()
    }

    /**
     * Set role assignments (typically from backend /config/multi endpoint)
     */
    setRoleAssignments(assignments: ModelRoleAssignments): void {
        this.roleAssignments = assignments
    }

    /**
     * Check if multi-model is configured
     */
    hasMultiModelConfig(): boolean {
        return this.roleAssignments !== null && (
            !!this.roleAssignments.frontend ||
            !!this.roleAssignments.backend ||
            !!this.roleAssignments.documentation
        )
    }

    /**
     * Get the appropriate model config for a prompt
     */
    getModelForPrompt(prompt: string, files?: string[]): RoleModelConfig {
        const analysis = this.categorizer.categorize(prompt, files)
        const role = this.categoryToRole(analysis.category)
        return this.getModelForRole(role)
    }

    /**
     * Get model config for a specific role
     */
    getModelForRole(role: ModelRole): RoleModelConfig {
        // If we have role assignments, use them
        if (this.roleAssignments) {
            const roleConfig = this.roleAssignments[role]
            if (roleConfig) {
                return roleConfig
            }
            // Fallback to general
            return this.roleAssignments.general
        }

        // No role assignments - return default from memory/config
        return this.getDefaultConfig()
    }

    /**
     * Get the role that would be used for a prompt (for display/debugging)
     */
    getRoleForPrompt(prompt: string, files?: string[]): { role: ModelRole; reasoning: string } {
        const analysis = this.categorizer.categorize(prompt, files)
        return {
            role: this.categoryToRole(analysis.category),
            reasoning: analysis.reasoning,
        }
    }

    /**
     * Convert task category to model role
     */
    private categoryToRole(category: TaskCategory): ModelRole {
        switch (category) {
            case 'frontend':
                return 'frontend'
            case 'backend':
                return 'backend'
            case 'documentation':
                return 'documentation'
            case 'fullstack':
            case 'general':
            default:
                return 'general'
        }
    }

    /**
     * Get default config from memory credentials or global config
     */
    private getDefaultConfig(): RoleModelConfig {
        const config = getGlobalConfig()

        // Check memory credentials first (from backend sync)
        if (hasMemoryCredentials()) {
            const memoryKey = getMemoryApiKey()
            const memoryBaseURL = getMemoryBaseURL()
            if (memoryKey) {
                return {
                    provider: config.primaryProvider || 'openai',
                    model: config.smallModelName || config.largeModelName || 'gpt-4',
                    apiKey: memoryKey,
                    baseURL: memoryBaseURL || undefined,
                }
            }
        }

        // Fallback to config values
        return {
            provider: config.primaryProvider || 'openai',
            model: config.smallModelName || config.largeModelName || 'gpt-4',
            apiKey: config.primaryApiKey || '',
            baseURL: config.smallModelBaseURL || config.largeModelBaseURL || undefined,
        }
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let selectorInstance: ModelSelector | null = null

export function getModelSelector(): ModelSelector {
    if (!selectorInstance) {
        selectorInstance = new ModelSelector()
    }
    return selectorInstance
}

export function resetModelSelector(): void {
    selectorInstance = null
}
