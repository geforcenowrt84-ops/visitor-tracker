/**
 * Visitor Tracker Script - Simplified Version
 * Embed this script in any website to log comprehensive visitor information
 *
 * Usage: <script src="https://YOUR-APP.vercel.app/v.js"></script>
 */

(function () {
  "use strict";

  // Auto-detect server URL from script source
  const scripts = document.getElementsByTagName("script");
  let TRACKER_SERVER = "";

  for (let i = 0; i < scripts.length; i++) {
    const src = scripts[i].src;
    if (src && src.includes("v.js")) {
      TRACKER_SERVER = src
        .replace("/v.js", "")
        .replace("/public/v.js", "");
      break;
    }
  }

  TRACKER_SERVER = TRACKER_SERVER || window.TRACKER_SERVER || "";

  // Generate or retrieve visitor ID for return visitor tracking
  function getVisitorId() {
    let visitorId = localStorage.getItem("_vt_visitor_id");
    if (!visitorId) {
      visitorId =
        "v_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("_vt_visitor_id", visitorId);
    }
    return visitorId;
  }

  // Check if returning visitor
  function isReturningVisitor() {
    const lastVisit = localStorage.getItem("_vt_last_visit");
    const isReturning = lastVisit ? true : false;
    localStorage.setItem("_vt_last_visit", Date.now().toString());
    return isReturning;
  }

  // Get visit count
  function getVisitCount() {
    let count = parseInt(localStorage.getItem("_vt_visit_count") || "0");
    count++;
    localStorage.setItem("_vt_visit_count", count.toString());
    return count;
  }

  // Parse device name from user agent
  function getDeviceName() {
    const ua = navigator.userAgent;

    // Mobile devices
    if (/iPhone/.test(ua)) {
      const match = ua.match(/iPhone OS (\d+)/);
      return "iPhone" + (match ? " (iOS " + match[1] + ")" : "");
    }
    if (/iPad/.test(ua)) {
      return "iPad";
    }
    if (/Samsung/.test(ua)) {
      const match = ua.match(/SM-[A-Z0-9]+/);
      return match ? "Samsung " + match[0] : "Samsung Device";
    }
    if (/HUAWEI|Honor/.test(ua)) {
      const match = ua.match(/(HUAWEI|Honor)[- ]?([A-Z0-9-]+)/i);
      return match ? match[1] + " " + match[2] : "Huawei Device";
    }
    if (/Xiaomi|Redmi|POCO|Mi /.test(ua)) {
      const match = ua.match(/(Redmi|POCO|Mi)[- ]?([A-Z0-9 ]+)/i);
      return match ? match[1] + " " + match[2].trim() : "Xiaomi Device";
    }
    if (/OPPO/.test(ua)) {
      const match = ua.match(/OPPO[- ]?([A-Z0-9]+)/i);
      return match ? "OPPO " + match[1] : "OPPO Device";
    }
    if (/vivo/.test(ua)) {
      const match = ua.match(/vivo[- ]?([A-Z0-9]+)/i);
      return match ? "Vivo " + match[1] : "Vivo Device";
    }
    if (/Pixel/.test(ua)) {
      const match = ua.match(/Pixel[- ]?([A-Z0-9 ]+)/i);
      return match ? "Google Pixel " + match[1].trim() : "Google Pixel";
    }
    if (/OnePlus/.test(ua)) {
      const match = ua.match(/OnePlus[- ]?([A-Z0-9]+)/i);
      return match ? "OnePlus " + match[1] : "OnePlus Device";
    }
    if (/Android/.test(ua) && /Mobile/.test(ua)) {
      return "Android Phone";
    }
    if (/Android/.test(ua)) {
      return "Android Tablet";
    }

    // Desktop
    if (/Macintosh/.test(ua)) {
      return "Mac";
    }
    if (/Windows/.test(ua)) {
      if (/Windows NT 10/.test(ua)) return "Windows PC";
      if (/Windows NT 6.3/.test(ua)) return "Windows 8.1 PC";
      if (/Windows NT 6.1/.test(ua)) return "Windows 7 PC";
      return "Windows PC";
    }
    if (/Linux/.test(ua) && !/Android/.test(ua)) {
      return "Linux PC";
    }
    if (/CrOS/.test(ua)) {
      return "Chromebook";
    }

    return "Unknown Device";
  }

  // Get connection type
  function getConnectionType() {
    const conn =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    if (conn) {
      return {
        type: conn.effectiveType || conn.type || "unknown",
        downlink: conn.downlink || null,
        rtt: conn.rtt || null,
        saveData: conn.saveData || false,
      };
    }
    return { type: "unknown", downlink: null, rtt: null, saveData: false };
  }

  // Get battery info
  async function getBatteryInfo() {
    try {
      if (navigator.getBattery) {
        const battery = await navigator.getBattery();
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
        };
      }
    } catch (e) {}
    return { level: null, charging: null };
  }

  // Get UTM parameters
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source") || null,
      utm_medium: params.get("utm_medium") || null,
      utm_campaign: params.get("utm_campaign") || null,
      utm_term: params.get("utm_term") || null,
      utm_content: params.get("utm_content") || null,
    };
  }

  // Get performance metrics
  function getPerformanceMetrics() {
    try {
      const perf = window.performance;
      if (perf && perf.timing) {
        const t = perf.timing;
        return {
          pageLoadTime: t.loadEventEnd - t.navigationStart,
          domContentLoaded: t.domContentLoadedEventEnd - t.navigationStart,
          dnsLookup: t.domainLookupEnd - t.domainLookupStart,
          tcpConnect: t.connectEnd - t.connectStart,
          serverResponse: t.responseEnd - t.requestStart,
          domInteractive: t.domInteractive - t.navigationStart,
        };
      }
      // Use Performance API if available
      const entries = perf.getEntriesByType("navigation");
      if (entries && entries.length > 0) {
        const nav = entries[0];
        return {
          pageLoadTime: Math.round(nav.loadEventEnd),
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
          dnsLookup: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
          tcpConnect: Math.round(nav.connectEnd - nav.connectStart),
          serverResponse: Math.round(nav.responseEnd - nav.requestStart),
          domInteractive: Math.round(nav.domInteractive),
        };
      }
    } catch (e) {}
    return null;
  }

  // Track scroll depth
  let maxScrollDepth = 0;
  function updateScrollDepth() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight =
      Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      ) - window.innerHeight;
    const scrollPercent =
      docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
    maxScrollDepth = Math.max(maxScrollDepth, scrollPercent);
  }
  window.addEventListener("scroll", updateScrollDepth, { passive: true });

  // Track time on page
  const pageStartTime = Date.now();
  function getTimeOnPage() {
    return Math.round((Date.now() - pageStartTime) / 1000);
  }

  // Collect all visitor data (IP-based location only - handled by server)
  async function collectVisitorData() {
    const batteryInfo = await getBatteryInfo();
    const connection = getConnectionType();
    const utmParams = getUTMParams();

    return {
      // Basic info
      page: window.location.href,
      pageTitle: document.title,
      referrer: document.referrer || "Direct",
      userAgent: navigator.userAgent,

      // Screen & viewport
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,

      // Device info
      deviceName: getDeviceName(),
      platform: navigator.platform,
      language: navigator.language || navigator.userLanguage,
      languages: navigator.languages ? navigator.languages.join(", ") : null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),

      // Hardware
      cpuCores: navigator.hardwareConcurrency || null,
      deviceMemory: navigator.deviceMemory || null,
      touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,

      // Connection
      connectionType: connection.type,
      connectionDownlink: connection.downlink,
      connectionRtt: connection.rtt,
      saveData: connection.saveData,
      onLine: navigator.onLine,

      // Battery
      batteryLevel: batteryInfo.level,
      batteryCharging: batteryInfo.charging,

      // Visitor tracking
      visitorId: getVisitorId(),
      isReturning: isReturningVisitor(),
      visitCount: getVisitCount(),

      // UTM params
      ...utmParams,

      // Will be updated on unload
      scrollDepth: maxScrollDepth,
      timeOnPage: getTimeOnPage(),
    };
  }

  // Send data to tracker server
  async function sendVisitorData(isUnload = false) {
    if (!TRACKER_SERVER) {
      return;
    }

    try {
      const data = await collectVisitorData();
      data.scrollDepth = maxScrollDepth;
      data.timeOnPage = getTimeOnPage();
      data.isUnloadEvent = isUnload;

      // Get performance metrics (available after page load)
      const perfMetrics = getPerformanceMetrics();
      if (perfMetrics) {
        data.performance = perfMetrics;
      }

      if (isUnload && navigator.sendBeacon) {
        // Use sendBeacon for unload events (more reliable)
        // Must use Blob to set Content-Type for sendBeacon
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        navigator.sendBeacon(TRACKER_SERVER + "/api/v", blob);
      } else {
        fetch(TRACKER_SERVER + "/api/v", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          mode: "cors",
        }).catch(() => {});
      }
    } catch (error) {
      // Silent fail
    }
  }

  // Track if initial data has been sent
  let initialDataSent = false;

  // Send initial data on page load
  async function sendInitialData() {
    if (initialDataSent) return;
    initialDataSent = true;
    await sendVisitorData(false);
  }

  // Initialize
  if (document.readyState === "complete") {
    setTimeout(sendInitialData, 100);
  } else {
    window.addEventListener("load", () => {
      setTimeout(sendInitialData, 100);
    });
  }

  // Send updated data when leaving page (with scroll depth & time on page)
  window.addEventListener("beforeunload", () => {
    sendVisitorData(true);
  });

  // Also track visibility changes (user switches tabs)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      sendVisitorData(true);
    }
  });
})();
