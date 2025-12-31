const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const LOGS_FILE = path.join(__dirname, 'logs.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Read logs from file
function readLogs() {
  try {
    const data = fs.readFileSync(LOGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Helper: Write logs to file
function writeLogs(logs) {
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
}

// Helper: Get real IP from request
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'Unknown';
}

// Helper: Fetch IP geolocation from ipapi.co
async function getIPLocation(ip) {
  try {
    // Skip local IPs
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return {
        ip: ip,
        city: 'Local Network',
        region: 'Local',
        country: 'Local',
        country_name: 'Local Network',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        org: 'Local'
      };
    }
    
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { ip: ip, city: 'Unknown', country: 'Unknown' };
  }
}

// Helper: Parse User Agent
function parseUserAgent(userAgent) {
  const ua = userAgent || 'Unknown';
  
  // Detect Browser
  let browser = 'Unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
  
  // Detect OS
  let os = 'Unknown';
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';
  
  // Detect Device Type
  let device = 'Desktop';
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
    device = 'Mobile';
  } else if (ua.includes('Tablet') || ua.includes('iPad')) {
    device = 'Tablet';
  }
  
  return { browser, os, device };
}

// API: Log visitor
app.post('/api/log', async (req, res) => {
  try {
    const clientIP = getClientIP(req);
    const { page, referrer, userAgent, screenWidth, screenHeight, language } = req.body;
    
    // Get IP location
    const location = await getIPLocation(clientIP);
    
    // Parse user agent
    const { browser, os, device } = parseUserAgent(userAgent);
    
    // Create log entry
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ip: clientIP,
      city: location.city || 'Unknown',
      region: location.region || 'Unknown',
      country: location.country_name || location.country || 'Unknown',
      timezone: location.timezone || 'Unknown',
      isp: location.org || 'Unknown',
      browser,
      os,
      device,
      screenResolution: `${screenWidth || 0}x${screenHeight || 0}`,
      language: language || 'Unknown',
      page: page || 'Unknown',
      referrer: referrer || 'Direct'
    };
    
    // Save to logs
    const logs = readLogs();
    logs.unshift(logEntry); // Add to beginning
    
    // Keep only last 1000 logs to prevent file from getting too large
    if (logs.length > 1000) {
      logs.length = 1000;
    }
    
    writeLogs(logs);
    
    res.json({ success: true, message: 'Visit logged' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to log visit' });
  }
});

// API: Get all logs
app.get('/api/logs', (req, res) => {
  try {
    const logs = readLogs();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// API: Get stats summary
app.get('/api/stats', (req, res) => {
  try {
    const logs = readLogs();
    
    const stats = {
      totalVisits: logs.length,
      uniqueIPs: [...new Set(logs.map(l => l.ip))].length,
      topCountries: getTopItems(logs, 'country', 5),
      topBrowsers: getTopItems(logs, 'browser', 5),
      topDevices: getTopItems(logs, 'device', 3),
      recentVisits: logs.slice(0, 10)
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Helper: Get top items by count
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

// API: Clear logs
app.delete('/api/logs', (req, res) => {
  try {
    writeLogs([]);
    res.json({ success: true, message: 'Logs cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// Start server
app.listen(PORT, () => {
  // Server started on PORT
});
