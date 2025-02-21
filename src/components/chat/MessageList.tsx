import { Box } from "@mui/material";
import { FunctionComponent, useEffect, useRef } from "react";
import { ORMessage } from "../../shared/openRouterTypes";
import Message from "./Message";

type MessageListProps = {
  messages: ORMessage[];
  height: number;
};

const MessageList: FunctionComponent<MessageListProps> = ({
  messages,
  height,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Box
      sx={{
        height: height - 100, // Leave space for input
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        py: 2,
      }}
    >
      {messages.map((msg, index) => (
        <Message
          key={index}
          message={msg}
          messages={messages}
          isUser={msg.role === "user"}
        />
      ))}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
