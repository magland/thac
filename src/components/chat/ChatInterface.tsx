/* eslint-disable @typescript-eslint/no-explicit-any */
import { Box, CircularProgress, Stack } from "@mui/material";
import { FunctionComponent, useRef, useState } from "react";
import { useJupyterConnectivity } from "../../jupyter/JupyterConnectivity";
import { AVAILABLE_MODELS, sendChatMessage } from "../../services/openRouter";
import { ORMessage, ORToolCall } from "../../shared/openRouterTypes";
import { getAllTools } from "../../tools/allTools";
import { globalOutputItems } from "../../tools/tools/executePythonCode";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import StatusBar from "./StatusBar";

type ChatInterfaceProps = {
  width: number;
  height: number;
  onSendMessageToApp?: (message: any) => void;
  onNeurosiftUrlUpdate?: (url: string) => void;
};

const ChatInterface: FunctionComponent<ChatInterfaceProps> = ({
  width,
  height,
  onSendMessageToApp,
  onNeurosiftUrlUpdate,
}) => {
  const [selectedModel, setSelectedModel] = useState(
    "google/gemini-2.0-flash-001",
  );
  const [messages, setMessages] = useState<ORMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<
    ORMessage[] | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [tokensUp, setTokensUp] = useState(0);
  const [tokensDown, setTokensDown] = useState(0);
  const [cost, setCost] = useState(0);
  const jupyterConnectivity = useJupyterConnectivity();
  const [toolCallForPermission, setToolCallForPermission] = useState<
    ORToolCall | undefined
  >(undefined);
  const approvedToolCalls = useRef<
    { toolCall: ORToolCall; approved: boolean }[]
  >([]);

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
      const response = await sendChatMessage(
        [...messages, userMessage],
        selectedModel,
        {
          onInteractWithApp,
          onPendingMessages: (mm: ORMessage[]) => {
            setPendingMessages(mm);
          },
          jupyterConnectivity,
          askPermissionToRunTool: async (toolCall: ORToolCall) => {
            const allTools = await getAllTools();
            const tool = allTools.find(
              (t) => t.toolFunction.name === toolCall.function.name,
            );
            if (!tool) {
              throw new Error(`Tool not found: ${toolCall.function.name}`);
            }
            if (!tool.requiresPermission) {
              return true;
            }

            // important: while this is set here, it is not going to take effect in this scope
            setToolCallForPermission(toolCall);
            while (true) {
              for (const {
                toolCall: toolCall2,
                approved,
              } of approvedToolCalls.current) {
                if (toolCall2 === toolCall) {
                  setToolCallForPermission(undefined);
                  approvedToolCalls.current = approvedToolCalls.current.filter(
                    (x) => x.toolCall !== toolCallForPermission,
                  );
                  return approved;
                }
              }
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          },
        },
      );
      setPendingMessages(undefined);

      if (response.usage) {
        setTokensUp((prev) => prev + response.usage!.prompt_tokens);
        setTokensDown((prev) => prev + response.usage!.completion_tokens);
        setCost((prev) => prev + response.usage!.cost);
      }

      setMessages(response.messages);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Could add error handling UI here
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadChat = (chatData: any) => {
    // Validate uploaded data structure
    if (!chatData.messages || !Array.isArray(chatData.messages)) {
      alert("Invalid chat data: missing or invalid messages array");
      return;
    }

    // Handle files if present
    const nonImageFiles: string[] = [];
    if (chatData.files) {
      for (const [key, value] of Object.entries(chatData.files)) {
        if (typeof value === "string" && value.startsWith("base64:")) {
          const base64Content = value.substring(7);
          const fileExtension = key.split(".").pop()?.toLowerCase();

          if (fileExtension === "png") {
            globalOutputItems[key] = {
              type: "image",
              format: "png",
              content: base64Content,
            };
          } else {
            nonImageFiles.push(key);
          }
        }
      }
    }

    // Update chat state
    setMessages(chatData.messages);
    setPendingMessages(undefined);
    setToolCallForPermission(undefined);
    approvedToolCalls.current = [];

    // Update metadata if available
    if (chatData.metadata) {
      if (chatData.metadata.tokensUp) setTokensUp(chatData.metadata.tokensUp);
      if (chatData.metadata.tokensDown)
        setTokensDown(chatData.metadata.tokensDown);
      if (chatData.metadata.totalCost) setCost(chatData.metadata.totalCost);
      if (
        chatData.metadata.model &&
        AVAILABLE_MODELS.some((m) => m.model === chatData.metadata.model)
      ) {
        setSelectedModel(chatData.metadata.model);
      }
    }

    // Show warning for non-image files
    if (nonImageFiles.length > 0) {
      alert(
        `Warning: The following files were not loaded because they are not PNG images: ${nonImageFiles.join(", ")}`,
      );
    }
  };

  const handleDeleteChat = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete the entire chat?",
    );
    if (!confirmed) return;

    setMessages([]);
    setPendingMessages(undefined);
    setToolCallForPermission(undefined);
    approvedToolCalls.current = [];
    setTokensUp(0);
    setTokensDown(0);
    setCost(0);
  };

  const [currentPromptText, setCurrentPromptText] = useState("");

  return (
    <Box
      sx={{
        position: "relative",
        width,
        height,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <MessageList
        messages={pendingMessages ? pendingMessages : messages}
        toolCallForPermission={toolCallForPermission}
        onSetToolCallApproval={(toolCall, approved) => {
          approvedToolCalls.current.push({ toolCall, approved });
        }}
        height={height - 65} // Reduced to accommodate input and compact status bar
        onNeurosiftUrlUpdate={onNeurosiftUrlUpdate}
        onDeleteMessage={
          !isLoading
            ? (msg) => {
                const confirmed = window.confirm(
                  "Are you sure you want to delete this message and all subsequent messages?",
                );
                if (!confirmed) {
                  return;
                }
                const messageIndex = messages.findIndex((m) => m === msg);
                const index =
                  messageIndex === -1 ? messages.length : messageIndex;
                setMessages(messages.slice(0, index));
                setPendingMessages(undefined);
                setToolCallForPermission(undefined);
                approvedToolCalls.current = [];
                setCurrentPromptText(
                  typeof msg.content === "string" ? msg.content : "",
                );
              }
            : undefined
        }
      />
      <Stack spacing={1} sx={{ p: 1 }}>
        <MessageInput
          currentPromptText={currentPromptText}
          setCurrentPromptText={setCurrentPromptText}
          onSendMessage={handleSendMessage}
          disabled={isLoading}
        />
        {isLoading && (
          <CircularProgress size={20} sx={{ alignSelf: "center" }} />
        )}
      </Stack>
      <StatusBar
        selectedModel={selectedModel}
        onModelChange={(model) => setSelectedModel(model)}
        tokensUp={tokensUp}
        tokensDown={tokensDown}
        totalCost={cost}
        isLoading={isLoading}
        messages={messages}
        onDeleteChat={handleDeleteChat}
        onUploadChat={handleUploadChat}
      />
    </Box>
  );
};

export default ChatInterface;
