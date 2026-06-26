import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import './setup-env';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.config';
import { PrismaService } from '../src/prisma/prisma.service';

function setCookieHeaders(response: { headers: { [key: string]: unknown } }): string[] {
  const header = response.headers['set-cookie'];
  if (Array.isArray(header)) {
    return header.filter((cookie): cookie is string => typeof cookie === 'string');
  }
  return typeof header === 'string' ? [header] : [];
}

describe('auth', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  test('rejects invalid signup body with INVALID_INPUT', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'not-an-email', password: 'short', displayName: '' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.code).toBe('INVALID_INPUT');
        expect(body.message).toBe('Invalid request body');
        expect(body.details.email).toContain('email must be an email');
        expect(body.details.password).toContain('password must be longer than or equal to 8 characters');
        expect(body.details.displayName).toContain('displayName must be longer than or equal to 1 characters');
      });
  });

  test('signs up, sets refresh cookie, and returns access token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'riya@example.com', password: 'StrongPass123!', displayName: 'Riya' })
      .expect(201);

    expect(response.body.user.email).toBe('riya@example.com');
    expect(response.body.accessToken).toBeString();
    expect(setCookieHeaders(response).join(';')).toContain('wallet_refresh');
  });

  test('rejects duplicate signup without revealing account state in public message', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'riya@example.com', password: 'StrongPass123!', displayName: 'Riya' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.code).toBe('INVALID_INPUT');
        expect(body.message).toBe('Unable to create account with those details');
      });
  });

  test('returns current user for a valid bearer token', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'riya@example.com', password: 'StrongPass123!' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('riya@example.com');
        expect(body.displayName).toBe('Riya');
      });
  });

  test('refreshes access token from wallet_refresh cookie', async () => {
    const signup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'refresh@example.com', password: 'StrongPass123!', displayName: 'Refresh User' })
      .expect(201);
    const refreshCookie = setCookieHeaders(signup).find((cookie) => cookie.startsWith('wallet_refresh='));

    expect(refreshCookie).toBeString();
    if (!refreshCookie) {
      throw new Error('missing wallet_refresh cookie');
    }

    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200)
      .expect(({ body }) => {
        expect(body.user.email).toBe('refresh@example.com');
        expect(body.accessToken).toBeString();
      });

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('refresh@example.com');
      });
  });

  test('logout clears wallet_refresh cookie', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(200)
      .expect(({ body, headers }) => {
        expect(body).toEqual({ ok: true });
        const clearCookie = setCookieHeaders({ headers }).find((cookie) => cookie.startsWith('wallet_refresh='));
        expect(clearCookie).toBeString();
        if (!clearCookie) {
          throw new Error('missing wallet_refresh clear cookie');
        }
        expect(clearCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
        expect(clearCookie).toContain('Path=/auth/refresh');
      });
  });
});
