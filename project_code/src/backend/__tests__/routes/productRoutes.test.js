import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../server.js'

describe('Product Routes', () => {
  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/products')
    expect(res.status).toBe(401)
  })
})
