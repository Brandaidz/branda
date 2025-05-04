import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../server.js' // Path seems correct

describe('Integration App', () => {
  it('should return 200 on GET /api/health', async () => {
    // Test /api/health instead of / which serves frontend
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    // Check for the expected health status based on setup
    expect(res.body).toEqual({ status: 'healthy' })
  })

  it('should return 200 on GET / (serving frontend)', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(200)
    // Optionally check if content type is HTML
    // expect(res.headers['content-type']).toMatch(/html/)
  })
})

