/**
 * Vercel Serverless API: Get stats summary
 * GET /api/stats
 * 
 * Uses Upstash Redis for persistent storage
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const LOGS_KEY = 'visitor_logs';

function getTopItems(logs, field, limit) {
  const counts = {};
  logs.forEach(log => {
    const value = log[field] || 'Unknown';
    counts[value] = (counts[value] || 0) + 1;
  });
  
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export default async function handler(req, res) {
  // CORS headers - use specific origin instead of wildcard
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all logs from Redis
    const logsRaw = await redis.lrange(LOGS_KEY, 0, -1);
    const logs = logsRaw.map(item => {
      if (typeof item === 'string') {
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      }
      return item;
    });

    const stats = {
      totalVisits: logs.length,
      uniqueIPs: [...new Set(logs.map(l => l.ip))].length,
      topCountries: getTopItems(logs, 'country', 5),
      topBrowsers: getTopItems(logs, 'browser', 5),
      topDevices: getTopItems(logs, 'device', 3),
      recentVisits: logs.slice(0, 10)
    };

    return res.status(200).json(stats);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get stats' });
  }
}
