import NodeCache from 'node-cache';
import logger from './logger.js';

const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '300', 10);

class CacheManager {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: CACHE_TTL,
      checkperiod: 120,
      useClones: false
    });

    this.enabled = CACHE_ENABLED;

    if (this.enabled) {
      logger.info(`Cache enabled with TTL: ${CACHE_TTL}s`);
    } else {
      logger.info('Cache disabled');
    }
  }

  get(key) {
    if (!this.enabled) return undefined;

    const value = this.cache.get(key);
    if (value !== undefined) {
      logger.debug(`Cache HIT: ${key}`);
    } else {
      logger.debug(`Cache MISS: ${key}`);
    }
    return value;
  }

  set(key, value, ttl = CACHE_TTL) {
    if (!this.enabled) return false;

    const result = this.cache.set(key, value, ttl);
    logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
    return result;
  }

  del(key) {
    if (!this.enabled) return 0;

    const result = this.cache.del(key);
    logger.debug(`Cache DELETE: ${key}`);
    return result;
  }

  flush() {
    if (!this.enabled) return;

    this.cache.flushAll();
    logger.info('Cache flushed');
  }

  invalidatePattern(pattern) {
    if (!this.enabled) return;

    const keys = this.cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));

    if (matchingKeys.length > 0) {
      this.cache.del(matchingKeys);
      logger.debug(`Cache invalidated ${matchingKeys.length} keys matching: ${pattern}`);
    }
  }

  getStats() {
    return this.cache.getStats();
  }
}

export const cache = new CacheManager();
export default cache;
