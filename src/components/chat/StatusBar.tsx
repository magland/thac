/* eslint-disable @typescript-eslint/no-explicit-any */
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { FunctionComponent } from "react";
import { AVAILABLE_MODELS } from "../../services/openRouter";
import { ORMessage } from "@shared/openRouterTypes";
import { globalOutputItems } from "../../tools/tools/executePythonCode";

const StatusBar: FunctionComponent<{
  selectedModel: string;
  onModelChange: (model: string) => void;
  tokensUp?: number;
  tokensDown?: number;
  totalCost?: number;
  isLoading?: boolean;
  messages: ORMessage[];
  onDeleteChat?: () => void;
  onUploadChat?: (chatData: any) => void;
}> = ({
  selectedModel,
  onModelChange,
  tokensUp = 0,
  tokensDown = 0,
  totalCost = 0,
  isLoading = false,
  messages,
  onDeleteChat,
  onUploadChat,
}) => {
  const numMessages = messages.length;
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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
        <IconButton
          size="small"
          title="Clear all messages"
          disabled={isLoading || numMessages === 0}
          onClick={onDeleteChat}
          sx={{
            color: "text.secondary",
            "&:hover": {
              color: "error.main",
            },
          }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box
        sx={{
          fontSize: "0.8rem",
          color: "text.secondary",
          ml: "auto",
          display: "flex",
          gap: 0.5,
          alignItems: "center",
        }}
      >
        <span>
          ↑{(tokensUp / 1000).toFixed(1)}k ↓{(tokensDown / 1000).toFixed(1)}k
          tokens
        </span>
        <span>${totalCost.toFixed(3)}</span>
        <IconButton
          size="small"
          title="Download chat"
          onClick={() => {
            const messagesJson = JSON.stringify(messages, null, 2);
            const files: { [key: string]: string } = {};
            for (const k in globalOutputItems) {
              if (messagesJson.includes(k)) {
                const item = globalOutputItems[k];
                if (item.type === "image") {
                  files[k] = `base64:${item.content}`;
                }
              }
            }
            const chatData = {
              timestamp: new Date().toISOString(),
              messages: messages,
              files,
              metadata: {
                model: selectedModel,
                tokensUp,
                tokensDown,
                totalCost,
                messageCount: messages.length,
              },
            };

            const blob = new Blob([JSON.stringify(chatData, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `chat-${new Date().toISOString().split(".")[0].replace(/[:]/g, "-")}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          sx={{
            color: "text.secondary",
            "&:hover": {
              color: "primary.main",
            },
          }}
        >
          <FileDownloadIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          title="Upload chat"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;

              const reader = new FileReader();
              reader.onload = (e) => {
                try {
                  const chatData = JSON.parse(e.target?.result as string);
                  onUploadChat?.(chatData);
                } catch (error) {
                  console.error("Failed to parse chat JSON:", error);
                  alert(
                    "Failed to parse chat file. Please ensure it's a valid JSON file.",
                  );
                }
              };
              reader.readAsText(file);
            };
            input.click();
          }}
          sx={{
            color: "text.secondary",
            "&:hover": {
              color: "primary.main",
            },
          }}
        >
          <FileUploadIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default StatusBar;
