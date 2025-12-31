/**
 * Vercel Serverless API: Get all logs
 * GET /api/logs
 * DELETE /api/logs (clear all)
 * 
 * Uses Upstash Redis for persistent storage
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const LOGS_KEY = 'visitor_logs';

export default async function handler(req, res) {
  // CORS headers - use specific origin instead of wildcard
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get all logs from Redis
      const logsRaw = await redis.lrange(LOGS_KEY, 0, -1);
      const logs = logsRaw.map(item => {
        // Handle both string and already-parsed objects
        if (typeof item === 'string') {
          try {
            return JSON.parse(item);
          } catch {
            return item;
          }
        }
        return item;
      });
      return res.status(200).json(logs);
    }

    if (req.method === 'DELETE') {
      // Clear all logs
      await redis.del(LOGS_KEY);
      return res.status(200).json({ success: true, message: 'Logs cleared' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process request' });
  }
}
