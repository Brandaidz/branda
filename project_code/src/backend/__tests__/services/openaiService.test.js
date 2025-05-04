import { describe, it, expect, vi, beforeEach } from "vitest";
// Import the module to test
import * as openaiServiceActual from "../../services/openaiService.js";

// Explicitly mock the module and the function
vi.mock("../../services/openaiService.js", () => ({
  sendToOpenAI: vi.fn(), // Mock the specific function we want to test
}));

// Access the mocked function directly from the imported module
const openaiService = openaiServiceActual;

describe("OpenAI Service", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
    // Or specifically reset the mocked function
    // openaiService.sendToOpenAI.mockClear();
  });

  it("should call sendToOpenAI with correct prompt", async () => {
    const mockResponse = { success: true, content: "Hello from AI" };
    // Correctly access the mock function for setup
    openaiService.sendToOpenAI.mockResolvedValue(mockResponse);

    const prompt = "What is the capital of France?";
    const result = await openaiService.sendToOpenAI(prompt);

    expect(openaiService.sendToOpenAI).toHaveBeenCalledWith(prompt);
    expect(result).toEqual(mockResponse);
  });

  // Add more tests if needed, e.g., for error handling
  it("should handle errors from sendToOpenAI", async () => {
    const mockError = new Error("API Error");
    // Correctly access the mock function for setup
    openaiService.sendToOpenAI.mockRejectedValue(mockError);

    const prompt = "Another question";
    await expect(openaiService.sendToOpenAI(prompt)).rejects.toThrow("API Error");

    expect(openaiService.sendToOpenAI).toHaveBeenCalledWith(prompt);
  });
});

