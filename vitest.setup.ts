import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Définir les variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.OPENROUTER_KEY = 'dummy_openrouter_key'; // Ajout d'une clé factice
process.env.JWT_SECRET = 'dummy_jwt_secret'; // Assurer que les clés secrètes sont définies
// Ajoutez d'autres variables d'environnement nécessaires ici

// Simule mongoose (plus robuste)
vi.mock('mongoose', async () => {
  const actualMongoose = await vi.importActual('mongoose'); // Import actual types if needed
  return {
    ...actualMongoose, // Keep original types/statics if necessary
    connect: vi.fn().mockResolvedValue(undefined), // Mock connect
    Schema: class MockSchema { // Mock Schema class
      constructor(definition: any) {
        // Store definition if needed for tests
      }
      // Add other Schema methods if needed
    },
    model: vi.fn().mockImplementation((name, schema) => { // Mock model function
      // Return a basic mock model object/class if needed
      return class MockModel {
        static find = vi.fn().mockResolvedValue([]);
        static findOne = vi.fn().mockResolvedValue(null);
        static findById = vi.fn().mockResolvedValue(null);
        static create = vi.fn().mockImplementation(data => Promise.resolve(data));
        // Add other static methods if needed
        save = vi.fn().mockResolvedValue(this);
        // Add instance methods if needed
      };
    }),
    connection: {
      readyState: 1, // Simulate connected state
      on: vi.fn(),
      once: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    },
    // Add other mongoose exports if needed by the application
  };
});


// Simule helmet() qui retourne un middleware no-op
vi.mock('helmet', () => {
  // Retourne une fonction qui, lorsqu'appelée (app.use(helmet())),
  // retourne le middleware no-op.
  return {
    default: vi.fn().mockImplementation(() => (req: any, res: any, next: () => void) => next())
  };
});

// Simule cors() qui retourne un middleware no-op
vi.mock('cors', () => {
  // Retourne une fonction qui, lorsqu'appelée (app.use(cors())),
  // retourne le middleware no-op.
  return {
    default: vi.fn().mockImplementation(() => (req: any, res: any, next: () => void) => next())
  };
});

// Simule axios
vi.mock('axios', () => {
  return {
    default: {
      get: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      put: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
      create: vi.fn().mockReturnThis(), // Pour axios.create()
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() }
      }
    }
  };
});

// Simule ioredis
vi.mock('ioredis', () => {
  // Mock la classe Redis
  const Redis = vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    ping: vi.fn().mockResolvedValue('PONG'), // Ajout pour checkHealth
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined), // Ajout pour disconnectClient
    // Ajoutez d'autres méthodes utilisées par votre application
  }));
  // Correction: Exporter 'default' pour correspondre à l'import `import Redis from 'ioredis'`
  return { default: Redis }; 
});

// Simule winston (logger) - Correction pour addColors
vi.mock('winston', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    // Simule la méthode 'add' si elle est utilisée pour ajouter des transports
    add: vi.fn(), 
    // Simule 'remove' si nécessaire
    remove: vi.fn(),
  };
  const winstonMock = {
    createLogger: vi.fn(() => mockLogger),
    format: {
      combine: vi.fn(),
      timestamp: vi.fn(),
      json: vi.fn(),
      printf: vi.fn(),
      colorize: vi.fn(),
      simple: vi.fn(),
      // Ajoutez d'autres formats si nécessaire
    },
    transports: {
      Console: vi.fn(),
      File: vi.fn(),
      // Ajoutez d'autres transports si nécessaire
    },
    // Correction: addColors est une méthode de l'objet winston lui-même
    addColors: vi.fn(), 
  };
  // Assurer que l'export 'default' existe si winston est importé comme `import winston from 'winston'`
  return { ...winstonMock, default: winstonMock };
});

// Simule node-fetch
vi.mock('node-fetch', () => {
  return {
    default: vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}), // Mock la réponse JSON
      text: () => Promise.resolve(''), // Mock la réponse texte
      // Ajoutez d'autres propriétés/méthodes de réponse si nécessaire
    })
  };
});

// Simule dotenv - Correction pour export default
vi.mock('dotenv', () => {
  return {
    // Assurer que l'export 'default' existe si dotenv est importé comme `import dotenv from 'dotenv'`
    default: {
        config: vi.fn() // Mock la fonction config
    },
    config: vi.fn() // Garder aussi au cas où `import { config } from 'dotenv'` est utilisé
  };
});


// Simule prom-client - Correction pour Registry et ajout setDefaultLabels
vi.mock("prom-client", () => {
  const Counter = vi.fn(() => ({
    inc: vi.fn(),
    labels: vi.fn().mockReturnThis(), // Chainable
  }));
  const Gauge = vi.fn(() => ({
    inc: vi.fn(),
    dec: vi.fn(),
    set: vi.fn(),
    labels: vi.fn().mockReturnThis(), // Chainable
  }));
  const Histogram = vi.fn(() => ({
    observe: vi.fn(),
    startTimer: vi.fn(() => vi.fn()), // Returns a function to end timer
    labels: vi.fn().mockReturnThis(), // Chainable
  }));
  const Summary = vi.fn(() => ({
    observe: vi.fn(),
    startTimer: vi.fn(() => vi.fn()), // Returns a function to end timer
    labels: vi.fn().mockReturnThis(), // Chainable
  }));
  // Correction: Mock Registry comme une classe
  const Registry = vi.fn().mockImplementation(() => ({
    contentType: "text/plain; version=0.0.4; charset=utf-8",
    metrics: vi.fn().mockResolvedValue("# HELP test_metric Test metric\n# TYPE test_metric counter\ntest_metric 1\n"),
    registerMetric: vi.fn(),
    clear: vi.fn(),
    setDefaultLabels: vi.fn(), // Ajout de la méthode manquante
    // Add other register instance methods/properties if needed
  }));
  const register = new Registry(); // Créer une instance pour le registre global par défaut

  const promClientMock = {
    Counter,
    Gauge,
    Histogram,
    Summary,
    Registry, // Exporter la classe mockée
    register, // Exporter l'instance par défaut
    collectDefaultMetrics: vi.fn(),
    // Add other prom-client exports if needed
  };

  return { ...promClientMock, default: promClientMock }; // Assurer l'export default
});

// Simule rate-limit-redis (used by express-rate-limit)
vi.mock("rate-limit-redis", () => {
  // Mock the RedisStore class
  const RedisStore = vi.fn().mockImplementation(() => ({
    // Mock methods used by express-rate-limit
    // Retourne une structure compatible avec ce qu'attend `express-rate-limit`
    // Voir: https://github.com/express-rate-limit/rate-limit-redis/blob/master/src/index.ts
    // La méthode doit retourner [number, number, Date | undefined]
    // Ou pour la version 2.x: { totalHits: number, resetTime: Date | undefined }
    // Ajustons pour correspondre à la version potentiellement utilisée
    increment: vi.fn().mockResolvedValue({ totalHits: 1, resetTime: undefined }), 
    decrement: vi.fn(),
    resetKey: vi.fn(),
    // Add other methods if needed based on express-rate-limit usage
  }));
  return { default: RedisStore };
});

// Simule basic-auth
vi.mock('basic-auth', () => {
  // Mock la fonction exportée par défaut
  return {
    default: vi.fn((req) => {
      // Simule un utilisateur/mot de passe pour les tests si nécessaire
      // ou retourne undefined pour simuler l'absence d'authentification
      // Exemple: return { name: 'testuser', pass: 'testpass' };
      return undefined; 
    })
  };
});

// Simule jsonwebtoken
vi.mock('jsonwebtoken', () => {
  return {
    sign: vi.fn().mockReturnValue('mocked_jwt_token'),
    verify: vi.fn().mockReturnValue({ userId: 'mocked_user_id', iat: Date.now() / 1000, exp: Date.now() / 1000 + 3600 }),
    decode: vi.fn().mockReturnValue({ payload: 'mocked_payload' }),
    // Ajoutez d'autres fonctions si nécessaire
    default: {
      sign: vi.fn().mockReturnValue('mocked_jwt_token'),
      verify: vi.fn().mockReturnValue({ userId: 'mocked_user_id', iat: Date.now() / 1000, exp: Date.now() / 1000 + 3600 }),
      decode: vi.fn().mockReturnValue({ payload: 'mocked_payload' }),
    }
  };
});




// Simule bullmq
vi.mock("bullmq", () => {
  const Queue = vi.fn().mockImplementation((name, opts) => ({
    name,
    opts,
    add: vi.fn().mockResolvedValue({ id: "mock_job_id" }),
    process: vi.fn(),
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    // Ajoutez d'autres méthodes/propriétés de Queue si nécessaire
  }));
  const Worker = vi.fn().mockImplementation((name, processor, opts) => ({
    name,
    processor,
    opts,
    on: vi.fn(),
    run: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    // Ajoutez d'autres méthodes/propriétés de Worker si nécessaire
  }));
  const QueueEvents = vi.fn().mockImplementation((name, opts) => ({
    name,
    opts,
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    // Ajoutez d'autres méthodes/propriétés de QueueEvents si nécessaire
  }));

  const bullmqMock = {
    Queue,
    Worker,
    QueueEvents,
    // Ajoutez d'autres exports de bullmq si nécessaire
  };

  return { ...bullmqMock, default: bullmqMock }; // Assurer l'export default
});

