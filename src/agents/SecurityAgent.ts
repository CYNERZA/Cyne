/**
 * Security Agent - Specialized agent for security vulnerability analysis
 * 
 * Performs OWASP-based security scanning, secrets detection, and
 * security best practices analysis.
 */

import { BaseAgent, AgentConfig } from './BaseAgent'
import { Finding, Recommendation, Severity } from '../types/agents'
import { randomUUID } from 'crypto'
import { GrepTool } from '../tools/GrepTool/GrepTool'
import { ViewFileTool } from '../tools/ViewFileTool/ViewFileTool'
import { GlobTool } from '../tools/GlobTool/GlobTool'

// ============================================================================
// Security Agent Configuration
// ============================================================================

const SECURITY_SYSTEM_PROMPT = `You are a specialized security analyst agent. Your role is to:

1. **Identify Security Vulnerabilities**
   - SQL Injection, XSS, CSRF, XXE, SSRF
   - Authentication and authorization flaws
   - Insecure cryptographic implementations
   - Path traversal and file inclusion
   - Insecure deserialization

2. **Detect Secrets and Sensitive Data**
   - Hardcoded API keys, passwords, tokens
   - Private keys and certificates
   - Database credentials
   - AWS/GCP/Azure credentials

3. **Analyze Security Best Practices**
   - Input validation and sanitization
   - Output encoding
   - Secure session management
   - Proper error handling (no info leakage)
   - Secure HTTP headers

4. **Evaluate Dependencies**
   - Known vulnerable dependencies
   - Outdated packages with security issues
   - Unnecessary dependencies

When reporting findings, use this format:
🔴 CRITICAL: [description] - immediate action required
🟠 HIGH: [description] - should be fixed before deployment
🟡 MEDIUM: [description] - should be addressed soon
🟢 LOW: [description] - minor issue, fix when convenient

For each vulnerability, provide:
- Clear description of the issue
- File and line number if applicable
- Potential impact
- Recommended fix with code example if possible

Focus on actionable, specific findings rather than generic advice.`

const SECURITY_PATTERNS = {
  secrets: [
    /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{10,}['"]/gi,
    /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]+['"]/gi,
    /(?:secret|token)\s*[:=]\s*['"][^'"]{10,}['"]/gi,
    /(?:aws_access_key_id|aws_secret_access_key)\s*[:=]/gi,
    /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
    /ghp_[a-zA-Z0-9]{36}/g, // GitHub personal access token
    /sk-[a-zA-Z0-9]{48}/g,  // OpenAI API key
  ],
  injection: [
    /\$\{.*?\}/g, // Template injection
    /exec\s*\(/g,
    /eval\s*\(/g,
    /innerHTML\s*=/g,
    /document\.write/g,
    /\\.query\s*\(\s*['"`].*?\$\{/g, // SQL injection
  ],
  xss: [
    /innerHTML/g,
    /outerHTML/g,
    /document\.write/g,
    /dangerouslySetInnerHTML/g,
    /v-html/g,
    /\[innerHTML\]/g,
  ],
}

// ============================================================================
// Security Agent Implementation
// ============================================================================

export class SecurityAgent extends BaseAgent {
  constructor() {
    super({
      id: 'security',
      name: 'Security Agent',
      description: 'Analyzes code for security vulnerabilities, secrets, and security best practices',
      capabilities: ['security'],
      systemPrompt: SECURITY_SYSTEM_PROMPT,
      tools: [GrepTool, ViewFileTool, GlobTool],
      temperature: 0.3, // Lower temperature for more precise analysis
    })
  }

  /**
   * Override parseOutput for security-specific parsing
   */
  protected parseOutput(output: string): {
    findings: Finding[]
    recommendations: Recommendation[]
  } {
    const findings: Finding[] = []
    const recommendations: Recommendation[] = []

    // Parse security-specific finding patterns
    const criticalPattern = /🔴\s*CRITICAL:\s*(.+?)(?=(?:🔴|🟠|🟡|🟢|\n\n|$))/gs
    const highPattern = /🟠\s*HIGH:\s*(.+?)(?=(?:🔴|🟠|🟡|🟢|\n\n|$))/gs
    const mediumPattern = /🟡\s*MEDIUM:\s*(.+?)(?=(?:🔴|🟠|🟡|🟢|\n\n|$))/gs
    const lowPattern = /🟢\s*LOW:\s*(.+?)(?=(?:🔴|🟠|🟡|🟢|\n\n|$))/gs

    const extractFindings = (pattern: RegExp, severity: Severity) => {
      let match: RegExpExecArray | null
      while ((match = pattern.exec(output)) !== null) {
        const text = match[1].trim()
        const location = this.extractLocation(text)
        
        findings.push({
          id: randomUUID(),
          type: 'security',
          severity,
          title: this.extractTitle(text),
          description: text,
          location,
        })
      }
    }

    extractFindings(criticalPattern, 'critical')
    extractFindings(highPattern, 'high')
    extractFindings(mediumPattern, 'medium')
    extractFindings(lowPattern, 'low')

    // Extract recommendations
    const recPattern = /(?:recommend|fix|suggestion|remediation):\s*(.+?)(?:\n|$)/gi
    let match: RegExpExecArray | null
    while ((match = recPattern.exec(output)) !== null) {
      recommendations.push({
        id: randomUUID(),
        title: match[1].slice(0, 100),
        description: match[1],
        priority: 'high',
        effort: 'medium',
        impact: 'high',
      })
    }

    return { findings, recommendations }
  }

  /**
   * Extract file location from finding text
   */
  private extractLocation(text: string): Finding['location'] | undefined {
    // Pattern: file.ts:123 or file.ts line 123
    const locationPattern = /([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)(?::|\s+line\s+)(\d+)/i
    const match = locationPattern.exec(text)
    
    if (match) {
      return {
        file: match[1],
        startLine: parseInt(match[2], 10),
        endLine: parseInt(match[2], 10),
      }
    }
    
    return undefined
  }

  /**
   * Extract a clean title from finding text
   */
  private extractTitle(text: string): string {
    // Get first sentence or first 100 chars
    const firstSentence = text.split(/[.!?\n]/)[0]
    return firstSentence.slice(0, 100)
  }

  /**
   * Quick static analysis for common patterns
   */
  static quickScan(code: string): Finding[] {
    const findings: Finding[] = []

    for (const [category, patterns] of Object.entries(SECURITY_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = code.matchAll(pattern)
        for (const match of matches) {
          findings.push({
            id: randomUUID(),
            type: 'security',
            severity: category === 'secrets' ? 'critical' : 'high',
            title: `Potential ${category} issue detected`,
            description: `Found suspicious pattern: ${match[0].slice(0, 50)}...`,
            evidence: match[0],
          })
        }
      }
    }

    return findings
  }
}

// Export singleton instance
export const securityAgent = new SecurityAgent()
