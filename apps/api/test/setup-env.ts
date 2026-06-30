process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://wallet:wallet@localhost:55432/wallet';
process.env.API_PORT = process.env.API_PORT ?? '4000';
process.env.WEB_PUBLIC_URL = process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-test-refresh-secret';
process.env.COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? 'localhost';
process.env.NODE_ENV = 'test';
