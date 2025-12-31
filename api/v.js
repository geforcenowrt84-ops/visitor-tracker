/**
 * Vercel Serverless API: Log a visitor
 * POST /api/v
 * 
 * Uses Upstash Redis for persistent storage
 * IP-based location only
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const LOGS_KEY = 'visitor_logs';
const MAX_LOGS = 1000;

// Helper: Parse User Agent for browser & OS
function parseUserAgent(userAgent) {
  const ua = userAgent || 'Unknown';
  
  let browser = 'Unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
  
  let os = 'Unknown';
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';
  
  let deviceType = 'Desktop';
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
    deviceType = 'Mobile';
  } else if (ua.includes('Tablet') || ua.includes('iPad')) {
    deviceType = 'Tablet';
  }
  
  return { browser, os, deviceType };
}

// Helper: Get IP location with fallback
async function getIPLocation(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return { ip, city: 'Local', region: 'Local', country_name: 'Local', timezone: 'Local', org: 'Local' };
  }

  // Try ipapi.co first
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'visitor-tracker/1.0' }
    });
    const data = await response.json();
    if (data && data.city && !data.error) {
      return data;
    }
  } catch (e) {
    // Silent fail, try fallback
  }

  // Fallback to ip-api.com
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country,timezone,isp,lat,lon`);
    const data = await response.json();
    if (data && data.status === 'success') {
      return {
        ip,
        city: data.city || 'Unknown',
        region: data.regionName || 'Unknown',
        country_name: data.country || 'Unknown',
        timezone: data.timezone || 'Unknown',
        org: data.isp || 'Unknown',
        latitude: data.lat,
        longitude: data.lon
      };
    }
  } catch (e) {
    // Silent fail
  }

  return { ip, city: 'Unknown', region: 'Unknown', country_name: 'Unknown', timezone: 'Unknown', org: 'Unknown' };
}

export default async function handler(req, res) {
  // CORS headers - use specific origin instead of wildcard for credentials
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                     req.headers['x-real-ip'] ||
                     'Unknown';
    
    const body = req.body || {};
    const { browser, os, deviceType } = parseUserAgent(body.userAgent);
    const location = await getIPLocation(clientIP);
    
    // Build comprehensive log entry (IP-based location only)
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      
      // IP & Location (IP-based only)
      ip: clientIP,
      city: location.city || 'Unknown',
      region: location.region || 'Unknown',
      country: location.country_name || location.country || 'Unknown',
      isp: location.org || 'Unknown',
      
      // Coordinates from IP geolocation
      latitude: location.latitude || null,
      longitude: location.longitude || null,
      
      // Browser & OS
      browser,
      os,
      deviceType,
      deviceName: body.deviceName || 'Unknown',
      platform: body.platform || 'Unknown',
      
      // Screen & Viewport
      screenResolution: `${body.screenWidth || 0}x${body.screenHeight || 0}`,
      viewportSize: `${body.viewportWidth || 0}x${body.viewportHeight || 0}`,
      colorDepth: body.colorDepth || null,
      pixelRatio: body.pixelRatio || 1,
      
      // Language & Timezone
      language: body.language || 'Unknown',
      languages: body.languages || null,
      timezone: body.timezone || location.timezone || 'Unknown',
      timezoneOffset: body.timezoneOffset || null,
      
      // Hardware
      cpuCores: body.cpuCores || null,
      deviceMemory: body.deviceMemory ? `${body.deviceMemory} GB` : null,
      touchSupport: body.touchSupport || false,
      maxTouchPoints: body.maxTouchPoints || 0,
      
      // Connection
      connectionType: body.connectionType || 'Unknown',
      connectionSpeed: body.connectionDownlink ? `${body.connectionDownlink} Mbps` : null,
      connectionLatency: body.connectionRtt ? `${body.connectionRtt} ms` : null,
      saveData: body.saveData || false,
      online: body.onLine !== false,
      
      // Battery
      batteryLevel: body.batteryLevel !== null ? `${body.batteryLevel}%` : null,
      batteryCharging: body.batteryCharging,
      
      // Visitor Tracking
      visitorId: body.visitorId || null,
      isReturning: body.isReturning || false,
      visitCount: body.visitCount || 1,
      
      // Page Info
      page: body.page || 'Unknown',
      pageTitle: body.pageTitle || 'Unknown',
      referrer: body.referrer || 'Direct',
      
      // UTM Parameters
      utmSource: body.utm_source || null,
      utmMedium: body.utm_medium || null,
      utmCampaign: body.utm_campaign || null,
      
      // Engagement
      scrollDepth: body.scrollDepth ? `${body.scrollDepth}%` : '0%',
      timeOnPage: body.timeOnPage ? `${body.timeOnPage}s` : '0s',
      
      // Performance
      pageLoadTime: body.performance?.pageLoadTime ? `${body.performance.pageLoadTime}ms` : null,
      domContentLoaded: body.performance?.domContentLoaded ? `${body.performance.domContentLoaded}ms` : null,
      
      // Meta
      isUnloadEvent: body.isUnloadEvent || false
    };
    
    // For unload events, update existing entry instead of creating new one
    if (body.isUnloadEvent && body.visitorId) {
      // Try to find and update existing entry
      const existingLogs = await redis.lrange(LOGS_KEY, 0, 20);
      for (let i = 0; i < existingLogs.length; i++) {
        let log = existingLogs[i];
        if (typeof log === 'string') {
          try { log = JSON.parse(log); } catch { continue; }
        }
        if (log.visitorId === body.visitorId && !log.isUnloadEvent) {
          // Update with final scroll depth and time on page
          log.scrollDepth = logEntry.scrollDepth;
          log.timeOnPage = logEntry.timeOnPage;
          log.isUnloadEvent = true;
          await redis.lset(LOGS_KEY, i, JSON.stringify(log));
          return res.status(200).json({ success: true, message: 'Visit updated' });
        }
      }
    }
    
    // Add new log entry
    await redis.lpush(LOGS_KEY, JSON.stringify(logEntry));
    await redis.ltrim(LOGS_KEY, 0, MAX_LOGS - 1);
    
    return res.status(200).json({ success: true, message: 'Visit logged' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to log visit' });
  }
}
