import { Pool } from 'pg';
import Redis from 'ioredis';

// PostgreSQL Connection
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});


// Test database connection
db.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

db.on('error', (err:Error) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// Redis Connection
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  },
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

// Export types
export type DbPool = typeof db;
export type RedisClient = typeof redis;