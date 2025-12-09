import { z } from 'zod'
import * as React from 'react'
import { Text, Box } from 'ink'
import { Tool, ValidationResult } from '../../Tool'
import { readBrainDoc, writeBrainDoc, getAllBrainDocs, getBrainDir } from '../../services/brain'
import { isVSCodeConnected } from '../../services/vscodeSocket'

export const inputSchema = z.strictObject({
  action: z.enum(['read', 'write', 'list']).describe('Action to perform'),
  doc_type: z.enum(['task', 'plan', 'walkthrough']).optional().describe('Document type'),
  content: z.string().optional().describe('Content to write (for write action)')
})

type In = z.infer<typeof inputSchema>
export type Out = {
  action: string
  docType?: string
  content?: string
  path?: string
  docs?: { task: boolean; plan: boolean; walkthrough: boolean }
}

export const BrainTool = {
  name: 'Brain',
  async description() {
    return 'View or manage brain artifacts (task, implementation plan, walkthrough) - your planning documents'
  },
  inputSchema,
  isReadOnly: () => false,
  userFacingName: (input?: In) => {
    if (input?.action === 'write') return `Write ${input.doc_type || 'doc'}`
    if (input?.action === 'read') return `Read ${input.doc_type || 'doc'}`
    return 'Brain'
  },
  
  async isEnabled() {
    return true
  },
  
  needsPermissions(input: In) {
    return input.action === 'write'
  },
  
  async validateInput(input: In): Promise<ValidationResult> {
    if (!input.action) {
      return { result: false, message: 'action is required' }
    }
    if ((input.action === 'read' || input.action === 'write') && !input.doc_type) {
      return { result: false, message: 'doc_type is required for read/write' }
    }
    if (input.action === 'write' && !input.content) {
      return { result: false, message: 'content is required for write action' }
    }
    return { result: true, message: '' }
  },
  
  async prompt() {
    return `View or manage brain artifacts (planning documents).

Actions:
- read: Read a document (requires doc_type)
- write: Write a document (requires doc_type and content)
- list: List all available documents

Document Types:
- task: Current task tracking
- plan: Implementation plan
- walkthrough: Summary of completed work

Documents are stored in ~/.cyne/brain/`
  },
  
  renderToolUseMessage(input: In, { verbose }: { verbose: boolean }) {
    if (input.action === 'write') {
      return `🧠 Writing ${input.doc_type}...`
    }
    if (input.action === 'read') {
      return `🧠 Reading ${input.doc_type}...`
    }
    return '🧠 Listing brain documents...'
  },
  
  renderToolUseRejectedMessage() {
    return <Text color="red">❌ Brain operation cancelled</Text>
  },
  
  renderToolResultMessage(result: Out, { verbose }: { verbose: boolean }) {
    if (result.action === 'list' && result.docs) {
      return (
        <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1}>
          <Text bold color="magenta">🧠 Brain Documents</Text>
          <Text>{result.docs.task ? '✅' : '❌'} Task</Text>
          <Text>{result.docs.plan ? '✅' : '❌'} Implementation Plan</Text>
          <Text>{result.docs.walkthrough ? '✅' : '❌'} Walkthrough</Text>
          <Text color="dim">Location: {getBrainDir()}</Text>
        </Box>
      )
    }
    
    if (result.action === 'write') {
      return (
        <Box flexDirection="column">
          <Text color="green" bold>✅ Wrote {result.docType}</Text>
          <Text color="dim">{result.path}</Text>
        </Box>
      )
    }
    
    if (result.action === 'read' && result.content) {
      return (
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
          <Text bold color="cyan">📄 {result.docType?.toUpperCase()}</Text>
          <Text>{result.content.slice(0, 500)}{result.content.length > 500 ? '...' : ''}</Text>
        </Box>
      )
    }
    
    return <Text color="yellow">No content found</Text>
  },
  
  renderResultForAssistant(data: Out): string {
    if (data.action === 'list' && data.docs) {
      return `Brain Documents:
- Task: ${data.docs.task ? 'exists' : 'not found'}
- Plan: ${data.docs.plan ? 'exists' : 'not found'}
- Walkthrough: ${data.docs.walkthrough ? 'exists' : 'not found'}
Location: ${getBrainDir()}`
    }
    
    if (data.action === 'write') {
      return `Wrote ${data.docType} to ${data.path}`
    }
    
    if (data.action === 'read') {
      return data.content || 'No content found'
    }
    
    return 'Brain operation completed'
  },
  
  async *call(input: In, context: any) {
    let result: Out
    
    switch (input.action) {
      case 'list': {
        const docs = getAllBrainDocs()
        result = {
          action: 'list',
          docs: {
            task: docs.task !== null,
            plan: docs.plan !== null,
            walkthrough: docs.walkthrough !== null
          }
        }
        break
      }
      
      case 'read': {
        const content = readBrainDoc(input.doc_type!)
        result = {
          action: 'read',
          docType: input.doc_type,
          content: content || undefined
        }
        break
      }
      
      case 'write': {
        const path = writeBrainDoc(input.doc_type!, input.content!)
        result = {
          action: 'write',
          docType: input.doc_type,
          path
        }
        
        // Try to open in VS Code if connected
        if (isVSCodeConnected()) {
          try {
            const { sendRequest } = await import('../../services/vscodeSocket')
            await sendRequest('brain/open', { docType: input.doc_type })
          } catch {
            // Ignore
          }
        }
        break
      }
      
      default:
        throw new Error(`Unknown action: ${input.action}`)
    }
    
    yield {
      type: 'result',
      data: result,
      resultForAssistant: this.renderResultForAssistant(result)
    }
  }
} satisfies Tool<In, Out>
