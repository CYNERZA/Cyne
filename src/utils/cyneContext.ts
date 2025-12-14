/**
 * CYNE.md Context Loader
 * 
 * Provides CLAUDE.md-style project context file support for Cyne.
 * Automatically discovers and loads CYNE.md files for project-specific
 * configuration, guidelines, and context.
 */

import { promises as fs } from 'fs'
import * as path from 'path'
import { getCwd } from './state'
import { env } from './env'

// ============================================================================
// Types
// ============================================================================

export interface CyneContext {
  // Raw content from CYNE.md files
  projectContext?: string
  
  // Parsed sections from context files
  guidelines?: string[]
  codeStyle?: string
  commonCommands?: string[]
  projectStructure?: string
  customInstructions?: string
  
  // Skills loaded from SKILL.md files
  skills: Map<string, SkillDefinition>
  
  // Custom tool configurations
  customTools?: ToolConfiguration[]
  
  // Workflow definitions
  workflows?: WorkflowDefinition[]
  
  // Files that were loaded
  loadedFiles: string[]
}

export interface SkillDefinition {
  name: string
  description: string
  content: string
  trigger?: string[] // Keywords that activate this skill
  filePath: string
}

export interface ToolConfiguration {
  name: string
  enabled: boolean
  config?: Record<string, unknown>
}

export interface WorkflowDefinition {
  name: string
  description: string
  steps: WorkflowStep[]
}

export interface WorkflowStep {
  action: string
  description?: string
  autoRun?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const CONTEXT_FILES = [
  'CYNE.md',
  '.cyne/CYNE.md',
  '.cyne/context.md',
  'cynerza.md',
]

const SKILL_FILE_PATTERN = /SKILL\.md$/i
const SKILL_DIRS = ['.cyne/skills', '.cyne', 'docs']

// ============================================================================
// Context Loader Class
// ============================================================================

export class CyneContextLoader {
  private cache: Map<string, CyneContext> = new Map()
  private lastLoadTime: Map<string, number> = new Map()
  private cacheTimeout = 60000 // 1 minute

  /**
   * Load context for the current working directory
   */
  async loadContext(projectRoot?: string): Promise<CyneContext> {
    const root = projectRoot || getCwd()
    
    // Check cache
    const cached = this.cache.get(root)
    const lastLoad = this.lastLoadTime.get(root) || 0
    
    if (cached && Date.now() - lastLoad < this.cacheTimeout) {
      return cached
    }

    // Load fresh context
    const context = await this.buildContext(root)
    
    // Cache result
    this.cache.set(root, context)
    this.lastLoadTime.set(root, Date.now())
    
    return context
  }

  /**
   * Build context from all available sources
   */
  private async buildContext(root: string): Promise<CyneContext> {
    const context: CyneContext = {
      skills: new Map(),
      loadedFiles: [],
    }

    // Load main context files
    for (const filename of CONTEXT_FILES) {
      const filePath = path.join(root, filename)
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        context.projectContext = this.mergeContent(context.projectContext, content)
        context.loadedFiles.push(filePath)
        
        // Parse sections from the context file
        this.parseContextSections(content, context)
      } catch {
        // File doesn't exist, continue
      }
    }

    // Load global context from home directory
    const globalContextPath = path.join(env.HOME || '~', '.cyne', 'CYNE.md')
    try {
      const globalContent = await fs.readFile(globalContextPath, 'utf-8')
      // Prepend global context (project context takes precedence)
      context.projectContext = globalContent + '\n\n' + (context.projectContext || '')
      context.loadedFiles.push(globalContextPath)
    } catch {
      // No global context
    }

    // Load skills
    await this.loadSkills(root, context)

    // Load workflows
    await this.loadWorkflows(root, context)

    return context
  }

  /**
   * Parse sections from a context file
   */
  private parseContextSections(content: string, context: CyneContext): void {
    // Parse guidelines section
    const guidelinesMatch = content.match(/##?\s*Guidelines?\s*\n([\s\S]*?)(?=\n##?\s|\n$)/i)
    if (guidelinesMatch) {
      const guidelines = guidelinesMatch[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.replace(/^[-\d.]+\s*/, '').trim())
      
      context.guidelines = [...(context.guidelines || []), ...guidelines]
    }

    // Parse code style section
    const styleMatch = content.match(/##?\s*Code\s*Style\s*\n([\s\S]*?)(?=\n##?\s|\n$)/i)
    if (styleMatch) {
      context.codeStyle = styleMatch[1].trim()
    }

    // Parse common commands section
    const commandsMatch = content.match(/##?\s*(?:Common\s*)?Commands?\s*\n([\s\S]*?)(?=\n##?\s|\n$)/i)
    if (commandsMatch) {
      const commands = commandsMatch[1]
        .split('\n')
        .filter(line => line.includes('`'))
        .map(line => {
          const match = line.match(/`([^`]+)`/)
          return match ? match[1] : ''
        })
        .filter(Boolean)
      
      context.commonCommands = [...(context.commonCommands || []), ...commands]
    }

    // Parse custom instructions
    const instructionsMatch = content.match(/##?\s*Instructions?\s*\n([\s\S]*?)(?=\n##?\s|\n$)/i)
    if (instructionsMatch) {
      context.customInstructions = instructionsMatch[1].trim()
    }

    // Parse project structure
    const structureMatch = content.match(/##?\s*(?:Project\s*)?Structure\s*\n([\s\S]*?)(?=\n##?\s|\n$)/i)
    if (structureMatch) {
      context.projectStructure = structureMatch[1].trim()
    }
  }

  /**
   * Load SKILL.md files
   */
  private async loadSkills(root: string, context: CyneContext): Promise<void> {
    for (const dir of SKILL_DIRS) {
      const skillDir = path.join(root, dir)
      
      try {
        const entries = await fs.readdir(skillDir, { withFileTypes: true })
        
        for (const entry of entries) {
          if (entry.isFile() && SKILL_FILE_PATTERN.test(entry.name)) {
            const filePath = path.join(skillDir, entry.name)
            
            try {
              const content = await fs.readFile(filePath, 'utf-8')
              const skill = this.parseSkillFile(content, filePath)
              
              if (skill) {
                context.skills.set(skill.name, skill)
                context.loadedFiles.push(filePath)
              }
            } catch {
              // Skip unreadable files
            }
          }
        }
      } catch {
        // Directory doesn't exist
      }
    }
  }

  /**
   * Parse a SKILL.md file
   */
  private parseSkillFile(content: string, filePath: string): SkillDefinition | null {
    // Extract name from first heading or filename
    const nameMatch = content.match(/^#\s+(.+)$/m)
    const name = nameMatch 
      ? nameMatch[1].trim()
      : path.basename(filePath, '.md').replace(/SKILL[-_]?/i, '')

    // Extract description
    const descMatch = content.match(/^#\s+.+\n\n(.+?)(?:\n\n|$)/s)
    const description = descMatch ? descMatch[1].trim() : ''

    // Extract trigger keywords
    const triggerMatch = content.match(/##?\s*Triggers?\s*\n([\s\S]*?)(?=\n##?\s|\n$)/i)
    const trigger = triggerMatch
      ? triggerMatch[1].split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim().toLowerCase())
      : undefined

    return {
      name,
      description,
      content,
      trigger,
      filePath,
    }
  }

  /**
   * Load workflow definitions from .agent/workflows
   */
  private async loadWorkflows(root: string, context: CyneContext): Promise<void> {
    const workflowDir = path.join(root, '.agent', 'workflows')
    
    try {
      const entries = await fs.readdir(workflowDir, { withFileTypes: true })
      context.workflows = []
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          const filePath = path.join(workflowDir, entry.name)
          
          try {
            const content = await fs.readFile(filePath, 'utf-8')
            const workflow = this.parseWorkflowFile(content, entry.name)
            
            if (workflow) {
              context.workflows.push(workflow)
              context.loadedFiles.push(filePath)
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    } catch {
      // Workflows directory doesn't exist
    }
  }

  /**
   * Parse a workflow file
   */
  private parseWorkflowFile(content: string, filename: string): WorkflowDefinition | null {
    // Parse YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    let description = ''
    
    if (frontmatterMatch) {
      const descMatch = frontmatterMatch[1].match(/description:\s*(.+)/)
      if (descMatch) description = descMatch[1].trim()
    }

    const name = filename.replace('.md', '')

    // Parse steps (numbered lines)
    const steps: WorkflowStep[] = []
    const stepMatches = content.matchAll(/(\d+)\.\s+(.+?)(?:\n|$)/g)
    
    for (const match of stepMatches) {
      const stepContent = match[2].trim()
      const autoRun = content.includes('// turbo-all') ||
        content.split('\n')
          .findIndex(line => line.includes(stepContent)) > 0 &&
        content.split('\n')[
          content.split('\n').findIndex(line => line.includes(stepContent)) - 1
        ]?.includes('// turbo')

      steps.push({
        action: stepContent,
        autoRun,
      })
    }

    return {
      name,
      description,
      steps,
    }
  }

  /**
   * Merge content with separator
   */
  private mergeContent(existing: string | undefined, newContent: string): string {
    if (!existing) return newContent
    return existing + '\n\n---\n\n' + newContent
  }

  /**
   * Find a skill by trigger keyword
   */
  findSkillByTrigger(context: CyneContext, keyword: string): SkillDefinition | undefined {
    const lowerKeyword = keyword.toLowerCase()
    
    for (const skill of context.skills.values()) {
      if (skill.trigger?.some(t => lowerKeyword.includes(t))) {
        return skill
      }
    }
    
    return undefined
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
    this.lastLoadTime.clear()
  }

  /**
   * Check if project has CYNE.md context
   */
  async hasContext(projectRoot?: string): Promise<boolean> {
    const root = projectRoot || getCwd()
    
    for (const filename of CONTEXT_FILES) {
      try {
        await fs.access(path.join(root, filename))
        return true
      } catch {
        // Continue checking
      }
    }
    
    return false
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let loaderInstance: CyneContextLoader | null = null

export function getCyneContextLoader(): CyneContextLoader {
  if (!loaderInstance) {
    loaderInstance = new CyneContextLoader()
  }
  return loaderInstance
}

export async function loadCyneContext(projectRoot?: string): Promise<CyneContext> {
  return getCyneContextLoader().loadContext(projectRoot)
}

/**
 * Format context for inclusion in system prompt
 */
export function formatContextForPrompt(context: CyneContext): string {
  const parts: string[] = []

  if (context.projectContext) {
    parts.push(`<project_context>\n${context.projectContext}\n</project_context>`)
  }

  if (context.guidelines?.length) {
    parts.push(`<guidelines>\n${context.guidelines.map(g => `- ${g}`).join('\n')}\n</guidelines>`)
  }

  if (context.codeStyle) {
    parts.push(`<code_style>\n${context.codeStyle}\n</code_style>`)
  }

  if (context.commonCommands?.length) {
    parts.push(`<common_commands>\n${context.commonCommands.map(c => `- ${c}`).join('\n')}\n</common_commands>`)
  }

  if (context.customInstructions) {
    parts.push(`<custom_instructions>\n${context.customInstructions}\n</custom_instructions>`)
  }

  return parts.join('\n\n')
}
