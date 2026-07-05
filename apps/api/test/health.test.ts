import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import './setup-env';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.config';

describe('health', () => {
  let app: INestApplication;

  beforeAll(async () => {

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  test('returns API readiness', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', service: 'wallet-api' });
  });
});
