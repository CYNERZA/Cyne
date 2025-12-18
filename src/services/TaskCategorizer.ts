/**
 * Task Categorizer - Detects task type from prompts and files
 * 
 * Analyzes user prompts and file contexts to determine whether
 * the task is frontend, backend, or general in nature.
 */

export type TaskCategory = 'frontend' | 'backend' | 'fullstack' | 'documentation' | 'general'

// ============================================================================
// Pattern Definitions
// ============================================================================

const FRONTEND_PATTERNS: RegExp[] = [
    // Frameworks and libraries
    /\b(react|vue|angular|svelte|nextjs|next\.js|nuxt|remix|gatsby)\b/i,
    // UI concepts
    /\b(component|button|form|modal|dialog|dropdown|navbar|sidebar|footer|header)\b/i,
    // Styling
    /\b(css|scss|sass|less|tailwind|styled-components|emotion|bootstrap)\b/i,
    // Frontend languages
    /\b(jsx|tsx|html|svg)\b/i,
    // UI/UX terms
    /\b(ui|ux|layout|responsive|animation|transition|hover|click|touch)\b/i,
    // Frontend tools
    /\b(webpack|vite|parcel|esbuild|rollup)\b/i,
    // Design systems
    /\b(design\s*system|theme|colors?|typography|fonts?|spacing)\b/i,
]

const BACKEND_PATTERNS: RegExp[] = [
    // Frameworks
    /\b(express|fastapi|flask|django|rails|spring|nestjs|koa|hapi)\b/i,
    // Database
    /\b(database|sql|mysql|postgresql|postgres|mongodb|redis|sqlite|orm|prisma|sequelize)\b/i,
    // API concepts
    /\b(api|endpoint|route|controller|middleware|rest|graphql|grpc|webhook)\b/i,
    // Backend languages
    /\b(python|golang|rust|java|ruby|php|node\.?js)\b/i,
    // Authentication
    /\b(auth(?:entication)?|jwt|oauth|session|cookie|token|password|login)\b/i,
    // Server concepts
    /\b(server|microservice|docker|kubernetes|k8s|deployment|nginx|apache)\b/i,
    // Data processing
    /\b(migration|schema|model|entity|repository|service|worker|queue|cron)\b/i,
]

const DOCUMENTATION_PATTERNS: RegExp[] = [
    /\b(readme|documentation|docs?|comment|jsdoc|typedoc|docstring)\b/i,
    /\b(changelog|contributing|license|api\s*doc)\b/i,
    /\b(explain|describe)\s+(the\s+)?code\b/i,
    /\bgenerate\s+(docs?|documentation)\b/i,
]

// ============================================================================
// File Extension Mappings
// ============================================================================

const FRONTEND_EXTENSIONS = new Set([
    '.tsx', '.jsx', '.css', '.scss', '.sass', '.less',
    '.html', '.svg', '.vue', '.svelte',
])

const BACKEND_EXTENSIONS = new Set([
    '.py', '.go', '.rs', '.java', '.rb', '.php',
    '.sql', '.prisma', '.graphql',
])

// ============================================================================
// TaskCategorizer Class
// ============================================================================

export interface TaskAnalysis {
    category: TaskCategory
    confidence: number
    reasoning: string
    frontendScore: number
    backendScore: number
    documentationScore: number
}

export class TaskCategorizer {
    /**
     * Categorize a task based on prompt and optional file context
     */
    categorize(prompt: string, files?: string[]): TaskAnalysis {
        let frontendScore = 0
        let backendScore = 0
        let documentationScore = 0

        // Score from prompt patterns
        frontendScore += this.scorePatterns(prompt, FRONTEND_PATTERNS) * 10
        backendScore += this.scorePatterns(prompt, BACKEND_PATTERNS) * 10
        documentationScore += this.scorePatterns(prompt, DOCUMENTATION_PATTERNS) * 15

        // Score from file extensions
        if (files?.length) {
            for (const file of files) {
                const ext = this.getExtension(file)
                if (FRONTEND_EXTENSIONS.has(ext)) {
                    frontendScore += 5
                }
                if (BACKEND_EXTENSIONS.has(ext)) {
                    backendScore += 5
                }
            }
        }

        // Determine category
        const { category, confidence, reasoning } = this.determineCategory(
            frontendScore,
            backendScore,
            documentationScore
        )

        return {
            category,
            confidence,
            reasoning,
            frontendScore,
            backendScore,
            documentationScore,
        }
    }

    /**
     * Quick categorization returning just the category
     */
    categorizeQuick(prompt: string, files?: string[]): TaskCategory {
        return this.categorize(prompt, files).category
    }

    /**
     * Score how many patterns match in the prompt
     */
    private scorePatterns(prompt: string, patterns: RegExp[]): number {
        let score = 0
        for (const pattern of patterns) {
            if (pattern.test(prompt)) {
                score++
            }
        }
        return score
    }

    /**
     * Get file extension
     */
    private getExtension(filePath: string): string {
        const match = filePath.match(/\.[a-zA-Z0-9]+$/)
        return match ? match[0].toLowerCase() : ''
    }

    /**
     * Determine final category from scores
     */
    private determineCategory(
        frontendScore: number,
        backendScore: number,
        documentationScore: number
    ): { category: TaskCategory; confidence: number; reasoning: string } {
        const total = frontendScore + backendScore + documentationScore

        // Check for documentation first (explicitly requested)
        if (documentationScore > 0 && documentationScore >= frontendScore && documentationScore >= backendScore) {
            return {
                category: 'documentation',
                confidence: Math.min(documentationScore / 30, 1),
                reasoning: 'Documentation keywords detected',
            }
        }

        // No signals at all - general
        if (total === 0) {
            return {
                category: 'general',
                confidence: 0.5,
                reasoning: 'No specific frontend/backend patterns detected',
            }
        }

        // Both high - fullstack
        if (frontendScore > 10 && backendScore > 10) {
            return {
                category: 'fullstack',
                confidence: Math.min(total / 50, 1),
                reasoning: 'Both frontend and backend patterns detected',
            }
        }

        // Frontend dominant
        if (frontendScore > backendScore) {
            return {
                category: 'frontend',
                confidence: Math.min(frontendScore / 30, 1),
                reasoning: `Frontend patterns detected (score: ${frontendScore})`,
            }
        }

        // Backend dominant
        if (backendScore > frontendScore) {
            return {
                category: 'backend',
                confidence: Math.min(backendScore / 30, 1),
                reasoning: `Backend patterns detected (score: ${backendScore})`,
            }
        }

        // Equal scores - general
        return {
            category: 'general',
            confidence: 0.5,
            reasoning: 'Equal frontend/backend signals',
        }
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let categorizerInstance: TaskCategorizer | null = null

export function getTaskCategorizer(): TaskCategorizer {
    if (!categorizerInstance) {
        categorizerInstance = new TaskCategorizer()
    }
    return categorizerInstance
}
