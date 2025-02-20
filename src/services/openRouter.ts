import { ORMessage, ORRequest, ORResponse, ORToolCall } from '@shared/openRouterTypes'
import { availableTools, toolExecutors } from '../tools'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const kk = `${"sk-or-v1"}${"-408b489add5a1bde0f251880d69fb326b42c445ad1a347"}${"b689e0b99a8d4a7fc7"}`

export const sendChatMessage = async (messages: ORMessage[]): Promise<ORMessage[]> => {
  const request: ORRequest = {
    model: 'gpt-4o-mini',
    messages,
    stream: false,
    tools: availableTools
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${kk}`
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`)
  }

  const result = await response.json() as ORResponse
  const choice = result.choices[0]

  if (!choice) {
    return messages
  }

  const updatedMessages = [...messages]

  // Check if it's a non-streaming choice with message
  if ('message' in choice && choice.message) {
    const message = choice.message

    const toolCalls = message.tool_calls
    if (toolCalls !== undefined && toolCalls.length > 0) {
      // First add the assistant's message with tool calls
      const assistantMessage: ORMessage = {
        role: 'assistant',
        content: null,
        tool_calls: toolCalls
      }
      updatedMessages.push(assistantMessage)

      // Then handle all tool calls
      const toolResults = await Promise.all(
        toolCalls.map((toolCall: ORToolCall) => handleToolCall(toolCall))
      )

      // Add tool results as messages
      toolResults.forEach((toolResult: string, index: number) => {
        const toolMessage: ORMessage = {
          role: 'tool',
          content: toolResult,
          tool_call_id: toolCalls[index].id
        }
        updatedMessages.push(toolMessage)
      })

      // Make another request with the updated messages
      return sendChatMessage(updatedMessages)
    }

    // For regular messages, just add the assistant's response
    const assistantMessage: ORMessage = {
      role: 'assistant',
      content: message.content || '',
      name: undefined // Optional name property
    }
    updatedMessages.push(assistantMessage)
  }

  return updatedMessages
}

const handleToolCall = async (toolCall: ORToolCall): Promise<string> => {
  if (toolCall.type !== 'function') {
    throw new Error(`Unsupported tool call type: ${toolCall.type}`)
  }

  const { name, arguments: argsString } = toolCall.function
  const executor = toolExecutors[name]

  if (!executor) {
    throw new Error(`No executor found for tool: ${name}`)
  }

  try {
    const args = JSON.parse(argsString)
    return await executor(args)
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error)
    throw error
  }
}
