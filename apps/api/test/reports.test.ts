import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

async function signup(app: INestApplication, email: string) {
  const response = await request(app.getHttpServer())
    .post('/auth/signup')
    .send({ email, password: 'StrongPass123!', displayName: email.split('@')[0] })
    .expect(201);
  return response.body.accessToken as string;
}

async function createGroup(app: INestApplication, token: string, name = `Group ${crypto.randomUUID()}`) {
  const response = await request(app.getHttpServer())
    .post('/groups')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, currency: 'INR' })
    .expect(201);
  return response.body as { id: string; name: string; currency: string };
}

describe('dashboard reports', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.recurringExpense.deleteMany();
    await prisma.envelopeTransfer.deleteMany();
    await prisma.envelopeFunding.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.envelope.deleteMany();
    await prisma.invite.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.recurringExpense.deleteMany();
    await prisma.envelopeTransfer.deleteMany();
    await prisma.envelopeFunding.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.envelope.deleteMany();
    await prisma.invite.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  test('summarizes group balances and current-month spending', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');

    const envelope = await request(app.getHttpServer())
      .post(`/groups/${group.id}/envelopes`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Groceries' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/envelopes/${envelope.body.id}/funding`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ amountMinor: 10000, note: 'Monthly budget' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/expenses`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ envelopeId: envelope.body.id, amountMinor: 2500, spentAt: new Date().toISOString(), title: 'Vegetables' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/groups/${group.id}/dashboard`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body.totalAvailableMinor).toBe(7500);
    expect(response.body.spentThisMonthMinor).toBe(2500);
    expect(response.body.envelopes).toHaveLength(1);
    expect(response.body.generatedAt).toBeString();
  });
});
