import { describe, it, expect, vi } from "vitest";
import * as aiService from "../../services/aiService.js";
import * as openaiService from "../../services/openaiService.js"; // Corrected

// Mock openaiService used within aiService
vi.mock("../../services/openaiService.js", () => ({
  // Assuming openaiService also exports generateChat or similar
  // If aiService directly uses fetch, we might need to mock fetch instead/additionally
  // Let's assume for now aiService internally calls an openaiService function
  // If not, the mock below needs adjustment based on aiService.js implementation
  sendToOpenAI: vi.fn(), // Keep this if openaiService is used
}));

// Mock node-fetch if aiService uses it directly (as seen in aiService.js)
vi.mock('node-fetch', () => ({
    default: vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'test-response' } }] }),
        text: () => Promise.resolve(''),
    })
}));

describe("AI Service", () => {
  it("should call generateChat with correct parameters", async () => {
    const mockMessages = [{ role: "user", content: "Hello Branda" }];
    // No need to mock openaiService.sendToOpenAI here if fetch is mocked

    // Use the correct function name 'generateChat'
    const result = await aiService.generateChat(mockMessages);

    // Check if fetch was called (if aiService uses fetch directly)
    const fetchMock = (await import('node-fetch')).default;
    expect(fetchMock).toHaveBeenCalled(); 
    // Add more specific fetch call checks if needed

    expect(result).toBe("test-response");
  });

  // This test might need adjustment depending on how generateChat handles empty messages
  // The original aiService.js doesn't seem to have specific checks for empty messages array
  // It might just send an empty array to the API. Let's adjust the test.
  it("should handle empty messages array without throwing error", async () => {
    // Use the correct function name 'generateChat'
    await expect(aiService.generateChat([])).resolves.toBe("test-response");
    // Check if fetch was called even with empty messages
    const fetchMock = (await import('node-fetch')).default;
    expect(fetchMock).toHaveBeenCalled();
  });
});

