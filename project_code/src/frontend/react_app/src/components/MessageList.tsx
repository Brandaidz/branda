import React from 'react';
import { useChatStore } from '../store/useChatStore'; // Import Zustand store


// Skeleton component for a single message placeholder
const SkeletonMessage: React.FC<{ align: 'start' | 'end' }> = ({ align }) => (
  <div className={`chat ${align === 'end' ? 'chat-end' : 'chat-start'}`}>
    <div className="chat-bubble skeleton h-10 w-32"></div>
  </div>
);

const MessageList: React.FC = () => {
  // Get state from Zustand store
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.loading);
  const session = useChatStore((state) => state.session);

  // Determine if it's the initial loading state (no session ID yet or no messages and loading)
  const isInitialLoading = isLoading && (!session.sessionId || messages.length === 0);

  return (
    <div className="flex-grow p-4 overflow-y-auto space-y-4">
      {isInitialLoading ? (
        // Show skeleton loaders during initial load
        <>
          <SkeletonMessage align="start" />
          <SkeletonMessage align="end" />
          <SkeletonMessage align="start" />
        </>
      ) : messages.length === 0 ? (
        // Show empty state message if not loading and no messages
        <p className="text-center text-gray-500">No messages yet. Start the conversation!</p>
      ) : (
        // Render actual messages
        messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat ${msg.sender === 'user' ? 'chat-end' : 'chat-start'}`}
          >
            <div className={`chat-bubble ${msg.sender === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}>
              {msg.text}
            </div>
            <div className="chat-footer opacity-50">
              <time className="text-xs">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            </div>
          </div>
        ))
      )}
      {/* Display loading indicator for subsequent loads (when not initial load) */}
      {!isInitialLoading && isLoading && (
        <div className="chat chat-start">
          <div className="chat-bubble chat-bubble-secondary">
            <span className="loading loading-dots loading-md"></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;

