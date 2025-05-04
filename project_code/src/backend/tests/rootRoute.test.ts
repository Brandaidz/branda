import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../server.js' // Corrected path

describe('Root Route', () => {
  it('should return 200 on GET /', async () => {
    // Note: This might fail if '/' serves the frontend index.html
    // Consider testing a specific API endpoint like /api/health instead
    const res = await request(app).get('/')
    // If '/' serves index.html, status might be 200 but content is HTML
    // If it should be an API endpoint, adjust the test or server routing
    expect(res.status).toBe(200) 
  })
})

