import axios from 'axios';
import { Message } from '../types/chat'; // Import Message type

// Define the base URL for the API. Adjust if your backend runs elsewhere.
// Assuming the backend runs on port 5000 locally during development.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.MODE === "production" ? "/api" : "http://localhost:3001/api");

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Add Authorization header if needed, e.g., for JWT
    // 'Authorization': `Bearer ${getToken()}`
  },
});

// --- Chat API Service Functions ---

/**
 * Starts a new chat session.
 * @returns Promise containing the new session ID.
 */
export const startChatSession = async (): Promise<{ sessionId: string }> => {
  try {
    // Assuming the endpoint is /chat/start based on Postman collection
    const response = await apiClient.post('/chat/start');
    return response.data; // Expecting { sessionId: '...' }
  } catch (error) {
    console.error('Error starting chat session:', error);
    // Consider more robust error handling/throwing
    throw error;
  }
};

/**
 * Sends a message to a specific chat session.
 * @param sessionId The ID of the chat session.
 * @param message The user's message text.
 * @returns Promise containing the AI's response message.
 */
export const sendMessage = async (sessionId: string, message: string): Promise<{ reply: string }> => {
  try {
    // Assuming the endpoint is /chat/message based on Postman collection
    const response = await apiClient.post(`/chat/message`, { sessionId, message });
    return response.data; // Expecting { reply: '...' }
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Retrieves the message history for a specific chat session.
 * @param sessionId The ID of the chat session.
 * @returns Promise containing the array of messages.
 */
// Use the imported Message type for the return promise
export const getChatHistory = async (sessionId: string): Promise<Message[]> => {
  try {
    // Assuming the endpoint is /chat/history based on Postman collection
    // Might need to pass sessionId as a query param or path param depending on backend implementation
    const response = await apiClient.get(`/chat/history?sessionId=${sessionId}`);
    // Assuming the backend returns data compatible with the Message interface
    return response.data as Message[]; 
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
};

// Add other API service functions as needed...

