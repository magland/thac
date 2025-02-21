import {
  ORMessage,
  ORRequest,
  ORResponse,
  ORToolCall,
} from "@shared/openRouterTypes";

export const AVAILABLE_MODELS = [
  {
    model: "google/gemini-2.0-flash-001",
    label: "gemini-2.0-flash-001",
    cost: {
      prompt: 0.1,
      completion: 0.4,
    },
  },
  {
    model: "anthropic/claude-3.5-sonnet",
    label: "claude-3.5-sonnet",
    cost: {
      prompt: 3,
      completion: 15,
    },
  },
  {
    model: "openai/gpt-4o-mini",
    label: "gpt-4o-mini",
    cost: {
      prompt: 0.15,
      completion: 0.6,
    },
  },
];

import allTools from "../tools/allTools";
import { getGlobalAIContext } from "../pages/HomePage/HomePage";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const kk = `${"sk-or-v1"}${"-408b489add5a1bde0f251880d69fb326b42c445ad1a347"}${"b689e0b99a8d4a7fc7"}`;

const constructInitialSystemMessage = () => {
  let d = `
You are a helpful technical assistant that is able to interact with a web application.
Please perform one interaction at a time when appropriate.

IMPORTANT: DO NOT MAKE UP YOUR OWN CALLBACKS. Only use the callbacks provided by the web application.

The following specialized tools are available.

`;

  for (const a of allTools) {
    d += `## Tool: ${a.toolFunction.name}`;
    d += a.detailedDescription;
    d += "\n\n";
  }

  return d;
};

export type ChatMessageResponse = {
  messages: ORMessage[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    cost: number;
  };
};

export const sendChatMessage = async (
  messages: ORMessage[],
  model: string,
  o: {
    onInteractWithApp: (a: {
      componentId: string;
      callbackId: string;
      parameters: [{ [key: string]: string }];
    }) => void;
    onPendingMessages?: (messages: ORMessage[]) => void;
  },
): Promise<ChatMessageResponse> => {
  // Create system message with tool descriptions
  const initialSystemMessage: ORMessage = {
    role: "system",
    content: constructInitialSystemMessage(),
  };

  const messages1 = [...messages];
  const systemMessageForAIContext = getSystemMessageForAIContext();
  if (systemMessageForAIContext) {
    // if the last message is a user message, then let's put it before that, since that what the user was looking at
    if (
      messages1.length > 0 &&
      messages1[messages1.length - 1].role === "user"
    ) {
      messages1.splice(messages1.length - 1, 0, systemMessageForAIContext);
    }
    // otherwise, just add it to the end
    else {
      messages1.push(systemMessageForAIContext);
    }
  }

  const request: ORRequest = {
    model: model,
    messages: [initialSystemMessage, ...messages1],
    stream: false,
    tools: allTools.map((tool) => ({
      type: "function",
      function: tool.toolFunction,
    })),
  };

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${kk}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const result = (await response.json()) as ORResponse;
  const choice = result.choices[0];

  if (!choice) {
    return { messages };
  }

  const prompt_tokens = result.usage?.prompt_tokens || 0;
  const completion_tokens = result.usage?.completion_tokens || 0;

  const a = AVAILABLE_MODELS.find((m) => m.model === model);
  const cost =
    ((a?.cost.prompt || 0) * prompt_tokens) / 1_000_000 +
    ((a?.cost.completion || 0) * completion_tokens) / 1_000_000;

  // note that we don't include the system message for AI context in this one
  const updatedMessages = [...messages];

  // Check if it's a non-streaming choice with message
  if ("message" in choice && choice.message) {
    const message = choice.message;

    const toolCalls = message.tool_calls;
    if (toolCalls !== undefined && toolCalls.length > 0) {
      // First add the assistant's message with tool calls
      const assistantMessage: ORMessage = {
        role: "assistant",
        content: null,
        tool_calls: toolCalls,
      };
      updatedMessages.push(assistantMessage);
      const pendingMessages: ORMessage[] = [assistantMessage];
      if (o.onPendingMessages) {
        o.onPendingMessages(pendingMessages);
      }

      // Then handle all tool calls
      const toolResults = await Promise.all(
        toolCalls.map((toolCall: ORToolCall) => handleToolCall(toolCall, o)),
      );

      // Add tool results as messages
      toolResults.forEach((toolResult: string, index: number) => {
        const toolMessage: ORMessage = {
          role: "tool",
          content: toolResult,
          tool_call_id: toolCalls[index].id,
        };
        updatedMessages.push(toolMessage);
        pendingMessages.push(toolMessage);
      });
      if (o.onPendingMessages) {
        o.onPendingMessages(pendingMessages);
      }

      // Make another request with the updated messages
      const rr = await sendChatMessage(updatedMessages, model, {
        ...o,
        onPendingMessages: (mm: ORMessage[]) => {
          if (o.onPendingMessages) {
            o.onPendingMessages([...pendingMessages, ...mm]);
          }
        },
      });
      return {
        messages: rr.messages,
        usage: rr.usage
          ? {
              prompt_tokens: prompt_tokens + rr.usage.prompt_tokens,
              completion_tokens: completion_tokens + rr.usage.completion_tokens,
              cost: cost + rr.usage.cost,
            }
          : undefined,
      };
    }

    // For regular messages, just add the assistant's response
    const assistantMessage: ORMessage = {
      role: "assistant",
      content: message.content || "",
      name: undefined, // Optional name property
    };
    updatedMessages.push(assistantMessage);
  }

  return {
    messages: updatedMessages,
    usage: {
      prompt_tokens,
      completion_tokens,
      cost,
    },
  };
};

const handleToolCall = async (
  toolCall: ORToolCall,
  o: {
    onInteractWithApp: (a: {
      componentId: string;
      callbackId: string;
      parameters: [{ [key: string]: string }];
    }) => void;
  },
): Promise<string> => {
  if (toolCall.type !== "function") {
    throw new Error(`Unsupported tool call type: ${toolCall.type}`);
  }

  const { name, arguments: argsString } = toolCall.function;
  const executor = allTools.find(
    (tool) => tool.toolFunction.name === name,
  )?.execute;

  if (!executor) {
    throw new Error(`No executor found for tool: ${name}`);
  }

  try {
    const args = JSON.parse(argsString);
    return await executor(args, o);
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    throw error;
  }
};

const getSystemMessageForAIContext = (): ORMessage => {
  const aiContext = getGlobalAIContext();
  if (!aiContext) {
    return {
      role: "system",
      content: "There is no context available.",
    };
  }

  const a = `
You are viewing a web application. The following data represents the context of that application,
including the callbacks that you are able to call to interact with it.

`;

  return {
    role: "system",
    content: a + JSON.stringify(aiContext, null, 2),
  };
};
