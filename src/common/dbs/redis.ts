import redis from 'redis';

const redisClient = redis.createClient({
   host: process.env.REDIS_HOST || 'redis',
   port: Number(process.env.REDIS_PORT) || 6379,
   password: process.env.REDIS_PASSWORD
});

export default redisClient;