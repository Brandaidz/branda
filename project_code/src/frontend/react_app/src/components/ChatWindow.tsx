import React, { useCallback, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { startChatSession, sendMessage } from '../services/chatService'; // Import API service
import { useChatStore } from '../store/useChatStore'; // Import Zustand store
import { Message } from '../types/chat'; // Import Message type
import toast from 'react-hot-toast'; // Import toast for error notifications

const ChatWindow: React.FC = () => {
  // Get state and actions from Zustand store
  // Removed unused 'messages' and 'error' from destructuring
  // Renamed 'isLoading' to 'loading' to match store definition
  const {
    session,
    loading, // Corrected name
    setSessionId,
    addMessage,
    setLoading,
    setError,
    resetChat,
  } = useChatStore();

  // Effect to start a chat session when the component mounts or resets
  useEffect(() => {
    const initializeChat = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await startChatSession();
        setSessionId(data.sessionId);
        // Add initial AI welcome message after session starts
        const welcomeMessage: Message = {
          id: 'initial-ai-msg',
          text: 'Hello! How can I help you today?',
          sender: 'ai',
          timestamp: Date.now(), // Use timestamp number
        };
        addMessage(welcomeMessage);
      } catch (err) {
        console.error("Failed to start chat session:", err);
        const errorMsg = 'Failed to connect to the chat service. Please try refreshing.';
        setError(errorMsg);
        toast.error(errorMsg); // Show toast notification
        resetChat(); // Reset state on initial connection failure
      } finally {
        setLoading(false);
      }
    };

    // Only initialize if there's no session ID
    if (!session.sessionId) {
        initializeChat();
    }

    // Cleanup function to reset chat state on unmount (optional)
    // return () => {
    //   resetChat();
    // };
  }, [setSessionId, addMessage, setLoading, setError, resetChat, session.sessionId]); // Dependencies for initialization

  // Callback function to handle sending a new message
  const handleSendMessage = useCallback(async (newMessageText: string) => {
    if (!session.sessionId) {
      const errorMsg = 'Chat session is not active. Cannot send message.';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      text: newMessageText,
      sender: 'user',
      timestamp: Date.now(), // Use timestamp number
    };

    addMessage(newUserMessage);
    setLoading(true);
    setError(null);

    try {
      // Call the actual API
      const response = await sendMessage(session.sessionId, newMessageText);

      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        text: response.reply, // Use the reply from the API
        sender: 'ai',
        timestamp: Date.now(), // Use timestamp number
      };
      addMessage(aiResponse);

    } catch (err) {
      console.error("Failed to send message or get reply:", err);
      const errorMsg = 'Failed to get response from AI. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg); // Show toast notification
      // Optionally, add an error message to the chat list (or rely on toast)
      // const errorResponse: Message = {
      //   id: `error-${Date.now()}`,
      //   text: 'Sorry, I encountered an error. Please try sending your message again.',
      //   sender: 'ai',
      //   timestamp: Date.now(),
      // };
      // addMessage(errorResponse);
    } finally {
      setLoading(false);
    }

  }, [session.sessionId, addMessage, setLoading, setError]); // Dependencies for sending message

  return (
    <div className="flex flex-col h-screen bg-base-200">
      {/* Header */}
      <div className="bg-primary text-primary-content p-4 shadow-md flex-shrink-0">
        <h1 className="text-xl font-bold">Branda Chat</h1>
      </div>

      {/* Message List - No props needed, gets data from store */}
      <MessageList />

      {/* Message Input - Disable input if no session or while loading */}
      {/* Use 'loading' (correct name) from the store */}
      <MessageInput onSendMessage={handleSendMessage} disabled={!session.sessionId || loading} />
    </div>
  );
};

export default ChatWindow;

