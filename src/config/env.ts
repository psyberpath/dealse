import { cleanEnv, str, port, url } from 'envalid';
import 'dotenv/config';

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  DATABASE_URL: url({ desc: 'PostgreSQL connection string (e.g., Neon or Local)' }),
  REDIS_URL: str({ desc: 'Redis connection string (e.g., Upstash or Local)' }),
  GEMINI_API_KEY: str({ desc: 'Google Gemini API key' }),
  PORT: port({ default: 3000 }),
});
