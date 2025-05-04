// src/frontend/react_app/src/types/chat.ts

/**
 * Represents a single message in the chat.
 */
export interface Message {
  id: string; // Unique identifier for the message
  text: string; // Content of the message
  sender: 'user' | 'ai'; // Who sent the message
  timestamp: number; // Unix timestamp of when the message was sent/received
  // Add any other relevant message properties, e.g., metadata, status
}

/**
 * Represents the chat session state.
 */
export interface Session {
  sessionId: string | null; // Unique ID for the current chat session
  // Add other session-related data if needed, e.g., creation time, user ID
}

/**
 * Represents the state related to the active commerce context (if any).
 * Placeholder for potential future use.
 */
export interface CommerceContext {
  productId?: string;
  orderId?: string;
  // Add other commerce-related identifiers
}

