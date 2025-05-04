// /home/ubuntu/branda_project/home/ubuntu/branda_audit/src/backend/__mocks__/ioredis.js

// Mock the ioredis library
const mockIoRedisClient = {
  // Make .on a no-op to prevent registering listeners that log after tests
  on: jest.fn((event, callback) => {
    // console.log(`Mock IoRedis: Ignoring registration for event: ${event}`);
    return mockIoRedisClient; // Return this for chaining if needed
  }),
  connect: jest.fn().mockResolvedValue(undefined), // Simulate successful connection
  disconnect: jest.fn(), // Mock disconnect
  get: jest.fn().mockResolvedValue(null), // Default mock for get
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  ping: jest.fn().mockResolvedValue("PONG"), // Mock ping
  status: "ready", // Mock status
  // Add other methods used by redisService.js if necessary
};

class MockIoRedis {
  constructor(options) {
    // console.log("Mock IoRedis constructor called with options:", options);
    return mockIoRedisClient;
  }
}

// Add static methods if your code uses them, e.g., Redis.Cluster
MockIoRedis.Cluster = jest.fn();

// Export the mock class as the default export, matching ioredis usage
module.exports = MockIoRedis;
