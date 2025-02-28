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

import { getAllTools } from "../tools/allTools";
import { getGlobalAIContext } from "../pages/HomePage/HomePage";
import { JupyterConnectivityState } from "src/jupyter/JupyterConnectivity";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const kk = `${"sk-or-v1"}${"-408b489add5a1bde0f251880d69fb326b42c445ad1a347"}${"b689e0b99a8d4a7fc7"}`;

const constructInitialSystemMessage = async () => {
  let d = `
You are a helpful technical assistant that is able to interact with a web application.

IMPORTANT: DO NOT MAKE UP YOUR OWN CALLBACKS. Only use the callbacks provided by the web application.

The following specialized tools are available.

`;

  const tools = await getAllTools();
  for (const a of tools) {
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
    jupyterConnectivity: JupyterConnectivityState;
    askPermissionToRunTool: (toolCall: ORToolCall) => Promise<boolean>;
  },
): Promise<ChatMessageResponse> => {
  // Create system message with tool descriptions
  const initialSystemMessage: ORMessage = {
    role: "system",
    content: await constructInitialSystemMessage(),
  };

  const messages1 = [...messages];
  let systemMessageForAIContext: ORMessage | null =
    getSystemMessageForAIContext();
  // check whether this system message is the same as the last system message
  const systemMessages = messages1.filter((m) => m.role === "system");
  const lastSystemMessage =
    systemMessages.length > 0
      ? systemMessages[systemMessages.length - 1]
      : null;
  if (
    lastSystemMessage &&
    lastSystemMessage.content === systemMessageForAIContext.content
  ) {
    // if it is the same, then we don't need to add it again
    systemMessageForAIContext = null;
  }
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
    tools: (await getAllTools()).map((tool) => ({
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
  // const updatedMessages = [...messages];

  // actually we do
  const updatedMessages = [...messages1];
  if (o.onPendingMessages) {
    o.onPendingMessages(updatedMessages);
  }

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
      if (o.onPendingMessages) {
        o.onPendingMessages(updatedMessages);
      }

      for (const tc of toolCalls) {
        const okayToRun = await o.askPermissionToRunTool(tc);
        if (okayToRun) {
          const toolResult = await handleToolCall(tc, o);
          const toolMessage: ORMessage = {
            role: "tool",
            content: toolResult,
            tool_call_id: tc.id,
          };
          updatedMessages.push(toolMessage);
          if (o.onPendingMessages) {
            o.onPendingMessages(updatedMessages);
          }
        } else {
          const toolMessage: ORMessage = {
            role: "tool",
            content: "Tool execution was not approved by the user.",
            tool_call_id: tc.id,
          };
          updatedMessages.push(toolMessage);
          if (o.onPendingMessages) {
            o.onPendingMessages(updatedMessages);
          }
          break;
        }
      }

      let shouldMakeAnotherRequest = false;
      // only make another request if there was a tool call that was not interact_with_app
      for (const toolCall of toolCalls) {
        if (
          toolCall.type === "function" &&
          toolCall.function.name !== "interact_with_app"
        ) {
          shouldMakeAnotherRequest = true;
          break;
        }
      }

      if (!shouldMakeAnotherRequest) {
        return {
          messages: updatedMessages,
          usage: {
            prompt_tokens,
            completion_tokens,
            cost,
          },
        };
      }
      // Make another request with the updated messages
      const rr = await sendChatMessage(updatedMessages, model, {
        ...o,
        onPendingMessages: (mm: ORMessage[]) => {
          if (o.onPendingMessages) {
            o.onPendingMessages(mm);
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
    jupyterConnectivity: JupyterConnectivityState;
  },
): Promise<string> => {
  if (toolCall.type !== "function") {
    throw new Error(`Unsupported tool call type: ${toolCall.type}`);
  }

  const { name, arguments: argsString } = toolCall.function;
  const tools = await getAllTools();
  const executor = tools.find(
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

  // The leading ":" is important so we know not to show it in the chat interface
  // (I know it's a hack)
  const a = `:The following is information about what the user is seeing on the web application.`;

  return {
    role: "system",
    content: a + JSON.stringify(aiContext, null, 2),
  };
};
