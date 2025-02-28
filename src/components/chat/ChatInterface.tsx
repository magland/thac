/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useRef, useState } from "react";
import {
  Box,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Stack,
} from "@mui/material";
import { ORMessage, ORToolCall } from "../../shared/openRouterTypes";
import { sendChatMessage, AVAILABLE_MODELS } from "../../services/openRouter";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { useJupyterConnectivity } from "../../jupyter/JupyterConnectivity";
import { getAllTools } from "../../tools/allTools";

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
          console.log("---- pushing to approvedToolCalls", toolCall, approved);
          approvedToolCalls.current.push({ toolCall, approved });
        }}
        height={height - 65} // Reduced to accommodate input and compact status bar
        onNeurosiftUrlUpdate={onNeurosiftUrlUpdate}
      />
      <Stack spacing={1} sx={{ p: 1 }}>
        <MessageInput onSendMessage={handleSendMessage} disabled={isLoading} />
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
      />
    </Box>
  );
};

const StatusBar: FunctionComponent<{
  selectedModel: string;
  onModelChange: (model: string) => void;
  tokensUp?: number;
  tokensDown?: number;
  totalCost?: number;
}> = ({
  selectedModel,
  onModelChange,
  tokensUp = 0,
  tokensDown = 0,
  totalCost = 0,
}) => {
  return (
    <Box
      sx={{
        p: 0.5,
        borderTop: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      <FormControl
        size="small"
        sx={{
          minWidth: 150,
          "& .MuiInputLabel-root": { fontSize: "0.8rem" },
          "& .MuiSelect-select": { fontSize: "0.8rem", py: 0.5 },
        }}
      >
        <InputLabel
          id="model-select-label"
          sx={{ backgroundColor: "background.paper", px: 0.25 }}
        >
          Model
        </InputLabel>
        <Select
          labelId="model-select-label"
          value={selectedModel}
          label="Model"
          onChange={(e) => onModelChange(e.target.value as string)}
        >
          {AVAILABLE_MODELS.map((m) => (
            <MenuItem key={m.model} value={m.model}>
              {m.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box
        sx={{
          fontSize: "0.8rem",
          color: "text.secondary",
          ml: "auto",
          display: "flex",
          gap: 2,
        }}
      >
        <span>
          ↑{(tokensUp / 1000).toFixed(1)}k ↓{(tokensDown / 1000).toFixed(1)}k
          tokens
        </span>
        <span>${totalCost.toFixed(3)}</span>
      </Box>
    </Box>
  );
};

export default ChatInterface;
