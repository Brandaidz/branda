import { jest } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// Use fake timers globally
jest.useFakeTimers();

// Mock logger globally to prevent import.meta error
jest.unstable_mockModule("@config/logger.js", () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
  },
  // If logger has named exports, mock them too
}));

// Mock ioredis globally using unstable_mockModule for ESM
jest.unstable_mockModule("ioredis", () => {
  const mockRedis = {
    on: jest.fn(),
    once: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
    sismember: jest.fn(),
    emit: jest.fn((event, ...args) => {
      if (event === 'ready') {
        const readyCallback = mockRedis.once.mock.calls.find(call => call[0] === 'ready');
        if (readyCallback && readyCallback[1]) {
          readyCallback[1]();
        }
      }
    }),
    isReady: true,
    status: 'ready',
  };
  const mockConstructor = jest.fn(() => mockRedis);
  mockConstructor.Redis = mockConstructor; // Mock named export if needed
  return {
    __esModule: true, // Indicate it's an ES module mock
    default: mockConstructor, // Mock the default export
    Redis: mockConstructor // Mock named export
  };
});


let mongoServer;

// Exécuté une fois avant tous les tests de la suite
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGO_URI_TEST = mongoUri; // Stocker l'URI pour db.js
});

// Exécuté une fois après tous les tests de la suite
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

