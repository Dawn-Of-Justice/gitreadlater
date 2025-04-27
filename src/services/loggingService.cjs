"use strict";

const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

// Production mode check
const isProduction = process.env.NODE_ENV === 'production';

// Create a logger that sanitizes sensitive data
const logger = {
  debug: (message, data = {}) => {
    if (!isProduction) {
      console.debug(`[DEBUG] ${message}`, sanitizeData(data));
    }
  },
  
  info: (message, data = {}) => {
    console.info(`[INFO] ${message}`, sanitizeData(data));
  },
  
  warn: (message, data = {}) => {
    console.warn(`[WARN] ${message}`, sanitizeData(data));
  },
  
  error: (message, error, context = {}) => {
    // Only log error name and message, not the full stack in production
    const errorData = isProduction ? 
      { name: error?.name, message: error?.message } : 
      error;
      
    console.error(`[ERROR] ${message}`, errorData, sanitizeData(context));
  }
};

// Function to sanitize sensitive data
function sanitizeData(data) {
  if (!data) return {};
  
  // Create a deep copy to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(data));
  
  // List of fields to redact
  const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
  
  // Recursively sanitize the object
  function sanitizeObject(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      } else if (typeof key === 'string' && 
                 sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        obj[key] = '[REDACTED]';
      }
    }
  }
  
  sanitizeObject(sanitized);
  return sanitized;
}

module.exports = logger;