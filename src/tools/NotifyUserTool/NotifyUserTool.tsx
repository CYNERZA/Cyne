import { Text } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import type { Tool } from '../../Tool'

const inputSchema = z.strictObject({
  PathsToReview: z.array(z.string()).describe('List of ABSOLUTE paths to files that the user should be notified about.'),
  BlockedOnUser: z.boolean().describe('Set to true if you are blocked on user approval to proceed.'),
  Message: z.string().describe('Required message to notify the user with.'),
  ConfidenceJustification: z.string().describe('Justification for the confidence score. Answer the 6 assessment questions.'),
  ConfidenceScore: z.number().describe('Confidence from 0.0-1.0.'),
})

export const NotifyUserTool = {
  name: 'notify_user',
  async description() {
    return 'Communicate with the user during an active task. This is the ONLY way to send messages while in task mode. Use to request artifact review or ask blocking questions.'
  },
  async prompt() {
    return `# notify_user Tool

Use this tool to communicate with users during task mode.

**When to Use:**
- Request artifact review (include paths in PathsToReview)
- Ask clarifying questions that block progress
- Batch independent questions into one call

**Effect:**
- Exits task view mode
- Returns to normal chat
- Blocks execution until user responds

**Required Parameters:**
- PathsToReview: Absolute paths to artifacts (if requesting review)
- BlockedOnUser: true if cannot proceed without approval
- Message: Concise message to user
- ConfidenceScore: 0.0-1.0 rating
- ConfidenceJustification: Answer 6 questions (Gaps/Assumptions/Complexity/Risk/Ambiguity/Irreversible)

**IMPORTANT:**
- This is the ONLY way to communicate during task mode
- Regular messages are invisible in task mode
- Keep Message concise`
  },
  inputSchema,
  isReadOnly() {
    return false
  },
  userFacingName() {
    return 'Notify User'
  },
  async isEnabled() {
    return true
  },
  needsPermissions(): boolean {
    return false
  },
  renderToolUseMessage({ Message }) {
    return `Notify: ${Message.substring(0, 50)}...`
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  renderToolResultMessage(output) {
    return <Text>&nbsp;&nbsp;⎿ Notified user (Confidence: {output.confidenceScore})</Text>
  },
  async validateInput({ ConfidenceScore }) {
    if (ConfidenceScore < 0 || ConfidenceScore > 1) {
      return {
        result: false,
        message: 'ConfidenceScore must be between 0.0 and 1.0',
      }
    }

    return { result: true, message: 'Valid input' }
  },
  async *call({ PathsToReview, BlockedOnUser, Message, ConfidenceScore, ConfidenceJustification }) {
    const data = {
      pathsToReview: PathsToReview,
      blockedOnUser: BlockedOnUser,
      message: Message,
      confidenceScore: ConfidenceScore,
      confidenceJustification: ConfidenceJustification,
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant(data) {
    return `Notified user (Confidence: ${data.confidenceScore}, Blocked: ${data.blockedOnUser})\nMessage: ${data.message}`
  },
} satisfies Tool
