// Vercel Serverless Function: /api/apod
// This file runs on the server, not in the browser.
// That means we can safely read process.env.NASA_API_KEY here.
//
// Simple request flow:
// 1) Frontend sends start_date and end_date to /api/apod
// 2) This function validates input + checks throttle
// 3) Server calls NASA APOD with private key
// 4) Server returns data to frontend

const NASA_APOD_URL = 'https://api.nasa.gov/planetary/apod';

// Per-IP throttle settings:
// - WINDOW_MS: how long each time window lasts
// - MAX_REQUESTS_PER_WINDOW: how many requests one IP can make in that window
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;

// In-memory request counter by IP address.
// This is great for class projects and small demos.
// In production with multiple server instances, use Redis or a database.
const requestLog = new Map();

function getClientIp(request) {
  // x-forwarded-for can contain a list like "ip1, ip2".
  // First value is usually the real client IP.
  const forwarded = request.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  // Fallback for local testing.
  return request.socket?.remoteAddress || 'unknown-client';
}

function isRateLimited(clientIp) {
  // Get current time and this IP's existing record (if any).
  const now = Date.now();
  const entry = requestLog.get(clientIp);

  // First request from this IP, start tracking.
  if (!entry) {
    // No record yet, so create one.
    requestLog.set(clientIp, { count: 1, windowStart: now });
    return { limited: false, retryAfterSeconds: 0 };
  }

  const elapsed = now - entry.windowStart;

  // If the time window has passed, reset counter.
  if (elapsed > WINDOW_MS) {
    // Old window expired, so start a new one.
    requestLog.set(clientIp, { count: 1, windowStart: now });
    return { limited: false, retryAfterSeconds: 0 };
  }

  // Same window: increment count and compare against limit.
  entry.count += 1;
  requestLog.set(clientIp, entry);

  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    // Tell user how many seconds are left before trying again.
    const retryAfterMs = WINDOW_MS - elapsed;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    return { limited: true, retryAfterSeconds };
  }

  return { limited: false, retryAfterSeconds: 0 };
}

export default async function handler(request, response) {
  // Every request to /api/apod goes through this function.
  // We always return JSON so frontend handling is consistent.
  // This endpoint is read-only, so we only allow GET requests.
  if (request.method !== 'GET') {
    return response.status(405).json({
      error: 'Method not allowed. Use GET.'
    });
  }

  // Read dates sent by the frontend query string.
  const { start_date: startDate, end_date: endDate } = request.query;

  // Basic validation so we can return a helpful error to the frontend.
  if (!startDate || !endDate) {
    return response.status(400).json({
      error: 'Missing required query parameters: start_date and end_date.'
    });
  }

  // Throttle repeated calls from the same IP to prevent accidental abuse.
  const clientIp = getClientIp(request);
  const throttleStatus = isRateLimited(clientIp);

  if (throttleStatus.limited) {
    // 429 = Too Many Requests.
    // Retry-After is a standard header that says when to try again.
    response.setHeader('Retry-After', String(throttleStatus.retryAfterSeconds));
    return response.status(429).json({
      error: `Too many requests. Please try again in ${throttleStatus.retryAfterSeconds} seconds.`
    });
  }

  // The key is stored in Vercel Environment Variables.
  const apiKey = process.env.NASA_API_KEY;

  if (!apiKey) {
    return response.status(500).json({
      error: 'Server key is not configured. Add NASA_API_KEY in Vercel settings.'
    });
  }

  // Build NASA APOD request with server-side key.
  const params = new URLSearchParams({
    api_key: apiKey,
    start_date: startDate,
    end_date: endDate,
    thumbs: 'true'
  });

  try {
    // Ask NASA for entries in this date range.
    const nasaResponse = await fetch(`${NASA_APOD_URL}?${params.toString()}`);
    const nasaData = await nasaResponse.json();

    // If NASA reports an error, pass the status/message back to the client.
    if (!nasaResponse.ok) {
      return response.status(nasaResponse.status).json({
        error: nasaData.msg || 'NASA API request failed.'
      });
    }

    // Success: return the APOD data exactly as received.
    return response.status(200).json(nasaData);
  } catch (error) {
    return response.status(500).json({
      error: 'Unexpected server error while contacting NASA.',
      details: error.message
    });
  }
}
