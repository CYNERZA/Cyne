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

const compact = {
  type: 'local',
  name: 'compact',
  description: 'Clear conversation history but keep a summary in context',
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
    // Get existing messages before clearing
    const messages = getMessagesGetter()()

    // Add summary request as a new message
    const summaryRequest = createUserMessage(
      "Provide a detailed but concise summary of our conversation above. Focus on information that would be helpful for continuing the conversation, including what we did, what we're doing, which files we're working on, and what we're going to do next.",
    )

    const summaryResponse = await queryOpenAI(
      normalizeMessagesForAPI([...messages, summaryRequest]),
      ['You are a helpful AI assistant tasked with summarizing conversations.'],
      0,
      tools,
      abortController.signal,
      {
        dangerouslySkipPermissions: false,
        model: slowAndCapableModel,
        prependCLISysprompt: true,
      },
    )

    // Extract summary from response, throw if we can't get it
    const content = summaryResponse.message.content
    const summary =
      typeof content === 'string'
        ? content
        : content.length > 0 && content[0]?.type === 'text'
          ? content[0].text
          : null

    if (!summary) {
      throw new Error(
        `Failed to generate conversation summary - response did not contain valid text content - ${summaryResponse}`,
      )
    } else if (summary.startsWith(API_ERROR_MESSAGE_PREFIX)) {
      throw new Error(summary)
    }

    // Clear screen and messages
    await clearTerminal()
    getMessagesSetter()([])
    setForkConvoWithMessagesOnTheNextRender([
      createUserMessage(
        `Use the /compact command to clear the conversation history, and start a new conversation with the summary in context.`,
      ),
      summaryResponse,
    ])
    getContext.cache.clear?.()
    getCodeStyle.cache.clear?.()

    return '' // not used, just for typesafety. TODO: avoid this hack
  },
  userFacingName() {
    return 'compact'
  },
} satisfies Command

export default compact
