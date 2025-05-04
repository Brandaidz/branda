import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../server.js'

describe('Auth Controller', () => {
  it('should return 404 on unknown route', async () => {
    const res = await request(app).get('/api/unknown')
    expect(res.status).toBe(404)
  })
})
