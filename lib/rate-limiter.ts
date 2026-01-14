// Simple in-memory rate limiter
// For production, consider using Redis or Upstash

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  limit: number; // Max requests per interval
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Store rate limit data in memory
const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 60 * 1000);

export function rateLimit(identifier: string, config: RateLimitConfig): {
  success: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // No record or expired - create new
  if (!record || record.resetTime < now) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + config.interval,
    });
    return {
      success: true,
      remaining: config.limit - 1,
      resetTime: now + config.interval,
    };
  }

  // Check if limit exceeded
  if (record.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  rateLimitMap.set(identifier, record);

  return {
    success: true,
    remaining: config.limit - record.count,
    resetTime: record.resetTime,
  };
}

// Predefined rate limit configs
export const RATE_LIMITS = {
  // AI Chat: 10 messages per minute per user
  AI_CHAT: { interval: 60 * 1000, limit: 10 },
  
  // OCR/Image Upload: 5 uploads per hour per user
  IMAGE_UPLOAD: { interval: 60 * 60 * 1000, limit: 5 },
  
  // Bug Reports: 5 reports per day per user/IP
  BUG_REPORT: { interval: 24 * 60 * 60 * 1000, limit: 5 },
  
  // Community Templates: 10 shares per day per user
  TEMPLATE_SHARE: { interval: 24 * 60 * 60 * 1000, limit: 10 },
  
  // Attendance Updates: 100 per hour per user
  ATTENDANCE_UPDATE: { interval: 60 * 60 * 1000, limit: 100 },
  
  // Timetable Operations: 50 per hour per user
  TIMETABLE_OPS: { interval: 60 * 60 * 1000, limit: 50 },
};

// Helper to get user identifier (user ID or IP)
export function getIdentifier(userId?: string, ip?: string): string {
  return userId || ip || 'anonymous';
}
