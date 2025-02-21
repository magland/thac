/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { ORMessage } from "../../shared/openRouterTypes";
import { sendChatMessage } from "../../services/openRouter";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { AIContext } from "src/pages/HomePage/AIContext";

type ChatInterfaceProps = {
  width: number;
  height: number;
  onSendMessageToApp?: (message: any) => void;
  aiContext: AIContext | undefined;
};

const ChatInterface: FunctionComponent<ChatInterfaceProps> = ({
  width,
  height,
  onSendMessageToApp,
  aiContext,
}) => {
  const [messages, setMessages] = useState<ORMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (content: string) => {
    const userMessage: ORMessage = {
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const onInteractWithApp = (a: {
      componentId: string;
      callbackId: string;
      parameters: [{ [key: string]: string }];
    }) => {
      if (!onSendMessageToApp) {
        return;
      }
      onSendMessageToApp({
        type: "aiCallback",
        componentId: a.componentId,
        callbackId: a.callbackId,
        parameters: a.parameters,
      });
    };

    try {
      const systemMessageForAIContext = getSystemMessageForAIContext(aiContext);
      let newMessages = await sendChatMessage(
        [...messages, systemMessageForAIContext, userMessage],
        {
          onInteractWithApp,
        },
      );
      // remove the systemMessageForAIContext from the messages
      newMessages = newMessages.filter(
        (message) => message !== systemMessageForAIContext,
      );
      setMessages(newMessages);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Could add error handling UI here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ position: "relative", width, height }}>
      <MessageList messages={messages} height={height} />
      {isLoading && (
        <Box
          sx={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
      <MessageInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </Box>
  );
};

const getSystemMessageForAIContext = (
  aiContext: AIContext | undefined,
): ORMessage => {
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

export default ChatInterface;
