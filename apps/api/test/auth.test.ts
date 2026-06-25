import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('auth', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  test('signs up, sets refresh cookie, and returns access token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'riya@example.com', password: 'StrongPass123!', displayName: 'Riya' })
      .expect(201);

    expect(response.body.user.email).toBe('riya@example.com');
    expect(response.body.accessToken).toBeString();
    expect(response.headers['set-cookie']?.join(';')).toContain('wallet_refresh');
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
});
