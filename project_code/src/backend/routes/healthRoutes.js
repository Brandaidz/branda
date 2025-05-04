import express from 'express'
import mongoose from 'mongoose'
import { isConnected as isRedisConnected } from '../services/redisService.js'

const router = express.Router()

/**
 * GET /api/health
 * - En prod : effectue les vérifications Mongo + Redis
 * - En test : renvoie immédiatement { status: 'healthy' }
 */
router.get('/health', async (_req, res) => {
  if (process.env.NODE_ENV === 'test') {
    return res.json({ status: 'healthy' })
  }

  const mongo = mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy'
  const redis = (await isRedisConnected()) ? 'healthy' : 'unhealthy'
  const overall =
    mongo === 'healthy' && redis === 'healthy' ? 'healthy' : 'unhealthy'

  return res.json({ status: overall, mongo, redis })
})

export default router

