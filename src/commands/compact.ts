import { Command } from '../commands'
import { getContext } from '../context'
import { getMessagesGetter, getMessagesSetter } from '../messages'
import { API_ERROR_MESSAGE_PREFIX, queryOpenAI } from '../services/cynerza'
import {
  createUserMessage,
  normalizeMessagesForAPI,
} from '../utils/messages.js'
import { getCodeStyle } from '../utils/style'
import { clearTerminal } from '../utils/terminal'

// Conversation summarization service with modular architecture
class ConversationSummaryService {
  private static readonly SUMMARY_PROMPT = 
    "Create a comprehensive but concise summary of our conversation that captures key context for continuing our work. Include: what we accomplished, current objectives, files being modified, and planned next steps."
  
  private static readonly SYSTEM_CONTEXT = [
    'You are a development assistant specializing in conversation summarization.'
  ]

  static async processConversationSummary(
    tools: any[],
    slowAndCapableModel: string,
    abortController: AbortController,
    setForkConvoWithMessagesOnTheNextRender: (messages: any[]) => void
  ): Promise<void> {
    const currentMessages = getMessagesGetter()()
    const summaryRequest = createUserMessage(this.SUMMARY_PROMPT)
    
    const summaryResponse = await this.generateSummary(
      currentMessages,
      summaryRequest,
      tools,
      slowAndCapableModel,
      abortController
    )

    await this.applySummaryResults(summaryResponse, setForkConvoWithMessagesOnTheNextRender)
  }

  private static async generateSummary(
    messages: any[],
    request: any,
    tools: any[],
    model: string,
    controller: AbortController
  ) {
    return await queryOpenAI(
      normalizeMessagesForAPI([...messages, request]),
      this.SYSTEM_CONTEXT,
      0,
      tools,
      controller.signal,
      {
        dangerouslySkipPermissions: false,
        model: model,
        prependCLISysprompt: true,
      },
    )
  }

  private static async applySummaryResults(
    summaryResponse: any,
    setForkConvoWithMessagesOnTheNextRender: (messages: any[]) => void
  ): Promise<void> {
    const content = summaryResponse.message.content
    const summary = this.extractSummaryText(content)

    if (!summary) {
      throw new Error(
        `Failed to generate conversation summary - response did not contain valid text content - ${summaryResponse}`,
      )
    } else if (summary.startsWith(API_ERROR_MESSAGE_PREFIX)) {
      throw new Error(summary)
    }

    await this.resetConversationState(summaryResponse, setForkConvoWithMessagesOnTheNextRender)
  }

  private static extractSummaryText(content: any): string | null {
    return typeof content === 'string'
      ? content
      : content.length > 0 && content[0]?.type === 'text'
        ? content[0].text
        : null
  }

  private static async resetConversationState(
    summaryResponse: any,
    setForkConvoWithMessagesOnTheNextRender: (messages: any[]) => void
  ): Promise<void> {
    await clearTerminal()
    getMessagesSetter()([])
    setForkConvoWithMessagesOnTheNextRender([
      createUserMessage(
        `Used /summary command to compress conversation history and continue with summarized context.`,
      ),
      summaryResponse,
    ])
    getContext.cache.clear?.()
    getCodeStyle.cache.clear?.()
  }
}

// Command factory with service integration
const createSummaryCommand = (): Command => ({
  type: 'local',
  name: 'summary',
  description: 'Compress conversation history while preserving context',
  isEnabled: true,
  isHidden: false,
  async call(
    _,
    {
      options: { tools, slowAndCapableModel },
      abortController,
      setForkConvoWithMessagesOnTheNextRender,
    },
  ) {
    await ConversationSummaryService.processConversationSummary(
      tools,
      slowAndCapableModel,
      abortController,
      setForkConvoWithMessagesOnTheNextRender
    )
    return ''
  },
  userFacingName() {
    return 'summary'
  },
})

export default createSummaryCommand()
