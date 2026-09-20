import Redis from 'ioredis';

const redisClient = new Redis('redis://default:x1fM8rlN8ghxAa3JGLv4DBc7ZA78o88K@wholesome-oasislike-train-55113.db.redis.io:17830');


redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

export default redisClient;