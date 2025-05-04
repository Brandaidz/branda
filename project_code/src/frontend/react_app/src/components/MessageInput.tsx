import React, { useState } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string) => void; // Callback to send the message
  disabled?: boolean; // Add disabled prop
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled = false }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue.trim());
      setInputValue(''); // Clear input after sending
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-base-100 border-t border-base-300 flex items-center space-x-2">
      <input
        type="text"
        placeholder={disabled ? "Connecting to chat..." : "Type your message here..."}
        className="input input-bordered flex-grow"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={disabled} // Apply disabled attribute
      />
      <button type="submit" className="btn btn-primary" disabled={disabled}> {/* Disable button too */}
        Send
      </button>
    </form>
  );
};

export default MessageInput;

