import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis;
  private isAvailable = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.redisClient = new Redis({
        host: this.configService.get('redis.host'),
        port: this.configService.get('redis.port'),
        password: this.configService.get('redis.password') || undefined,
        db: this.configService.get('redis.db'),
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.redisClient.on('connect', () => {
        this.logger.log('✅ Redis connected successfully');
        this.isAvailable = true;
      });

      this.redisClient.on('error', (err) => {
        this.logger.error('❌ Redis error:', err.message);
        this.isAvailable = false;
      });

      this.redisClient.on('close', () => {
        this.logger.warn('⚠️  Redis connection closed');
        this.isAvailable = false;
      });
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error.message);
      this.isAvailable = false;
    }
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable) {
      this.logger.warn(`Redis not available, skipping get for key: ${key}`);
      return null;
    }

    try {
      const value = await this.redisClient.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable) {
      this.logger.warn(`Redis not available, skipping set for key: ${key}`);
      return;
    }

    try {
      const serialized = JSON.stringify(value);

      if (ttlSeconds) {
        await this.redisClient.setex(key, ttlSeconds, serialized);
      } else {
        await this.redisClient.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error.message);
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    if (!this.isAvailable) {
      return;
    }

    try {
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error.message);
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.isAvailable) {
      return;
    }

    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        this.logger.log(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting pattern ${pattern}:`, error.message);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const result = await this.redisClient.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error setting expiration on key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get remaining TTL
   */
  async ttl(key: string): Promise<number> {
    if (!this.isAvailable) {
      return -1;
    }

    try {
      return await this.redisClient.ttl(key);
    } catch (error) {
      this.logger.error(`Error getting TTL for key ${key}:`, error.message);
      return -1;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    if (!this.isAvailable) {
      return 0;
    }

    try {
      return await this.redisClient.incr(key);
    } catch (error) {
      this.logger.error(`Error incrementing key ${key}:`, error.message);
      return 0;
    }
  }

  /**
   * Decrement a counter
   */
  async decr(key: string): Promise<number> {
    if (!this.isAvailable) {
      return 0;
    }

    try {
      return await this.redisClient.decr(key);
    } catch (error) {
      this.logger.error(`Error decrementing key ${key}:`, error.message);
      return 0;
    }
  }

  /**
   * Flush all keys (USE WITH CAUTION!)
   */
  async flushAll(): Promise<void> {
    if (!this.isAvailable) {
      return;
    }

    try {
      await this.redisClient.flushall();
      this.logger.warn('⚠️  All Redis keys have been flushed!');
    } catch (error) {
      this.logger.error('Error flushing Redis:', error.message);
    }
  }

  /**
   * Generate cache key for specific resource
   */
  static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return [prefix, ...parts].join(':');
  }
}
