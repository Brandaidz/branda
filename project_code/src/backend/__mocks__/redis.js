// /home/ubuntu/branda_project/home/ubuntu/branda_audit/src/backend/__mocks__/redis.js

// Mock the redis library
const mockRedisClient = {
  on: jest.fn((event, callback) => {
    // Optionally simulate events like 'connect' or 'error' for specific tests
    // if (event === 'connect') callback();
  }),
  connect: jest.fn().mockResolvedValue(undefined), // Simulate successful connection
  get: jest.fn().mockResolvedValue(null), // Default mock for get (e.g., token not in blacklist)
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  // Add other methods used by your application if necessary
};

const redis = {
  createClient: jest.fn(() => mockRedisClient),
};

module.exports = redis;
