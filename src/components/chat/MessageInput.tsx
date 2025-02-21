import { IconButton, Paper, TextField } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { FunctionComponent, KeyboardEvent, useState } from "react";

type MessageInputProps = {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
};

const MessageInput: FunctionComponent<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
}) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        display: "flex",
        alignItems: "center",
        gap: 1,
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
      }}
    >
      <TextField
        fullWidth
        multiline
        maxRows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={disabled}
        placeholder="Type your message..."
        sx={{ flex: 1 }}
      />
      <IconButton
        color="primary"
        onClick={handleSend}
        disabled={!message.trim() || disabled}
      >
        <SendIcon />
      </IconButton>
    </Paper>
  );
};

export default MessageInput;
