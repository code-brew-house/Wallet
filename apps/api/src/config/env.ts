import { z } from 'zod';

const developmentDefaults = {
  DATABASE_URL: 'postgresql://wallet:wallet@localhost:55432/wallet',
  WEB_PUBLIC_URL: 'http://localhost:3000',
  JWT_ACCESS_SECRET: 'development-access-secret-for-wallet-local',
  JWT_REFRESH_SECRET: 'development-refresh-secret-for-wallet-local',
  COOKIE_DOMAIN: 'localhost',
} satisfies Partial<NodeJS.ProcessEnv>;

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_PUBLIC_URL: z.string().url(),
  API_PUBLIC_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  COOKIE_DOMAIN: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv): Env {
  const nodeEnv = source.NODE_ENV ?? 'development';
  const defaults = nodeEnv === 'production' ? {} : developmentDefaults;
  return envSchema.parse({ ...defaults, ...source, NODE_ENV: nodeEnv });
}

export const env = loadEnv(process.env);
