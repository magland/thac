import { FunctionComponent, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { ORMessage } from '../../shared/openRouterTypes'
import { sendChatMessage } from '../../services/openRouter'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

type ChatInterfaceProps = {
  width: number
  height: number
}

const ChatInterface: FunctionComponent<ChatInterfaceProps> = ({ width, height }) => {
  const [messages, setMessages] = useState<ORMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (content: string) => {
    const userMessage: ORMessage = {
      role: 'user',
      content
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const newMessages = await sendChatMessage([...messages, userMessage])
      setMessages(newMessages)
    } catch (error) {
      console.error('Failed to send message:', error)
      // Could add error handling UI here
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box sx={{ position: 'relative', width, height }}>
      <MessageList messages={messages} height={height} />
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
      <MessageInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </Box>
  )
}

export default ChatInterface
