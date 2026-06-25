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

function expectErrorCode(body: { code?: string; response?: { code?: string } }, code: string) {
  expect(body.response?.code ?? body.code).toBe(code);
}

describe('envelope ledger', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
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

  test('creates, lists, funds, and transfers envelope balances', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');

    const createdEnvelope = await request(app.getHttpServer())
      .post(`/groups/${group.id}/envelopes`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Groceries' })
      .expect(201);
    expect(createdEnvelope.body.name).toBe('Groceries');
    expect(createdEnvelope.body.balanceMinor).toBe(0);

    const savingsEnvelope = await request(app.getHttpServer())
      .post(`/groups/${group.id}/envelopes`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Savings' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/groups/${group.id}/envelopes`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.map((envelope: { name: string; balanceMinor: number }) => [envelope.name, envelope.balanceMinor])).toEqual([
          ['Groceries', 0],
          ['Savings', 0],
        ]);
      });

    const funded = await request(app.getHttpServer())
      .post(`/groups/${group.id}/envelopes/${createdEnvelope.body.id}/funding`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ amountMinor: 50000, note: 'Monthly budget' })
      .expect(201);
    expect(funded.body.summary.balanceMinor).toBe(50000);

    const transfer = await request(app.getHttpServer())
      .post(`/groups/${group.id}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ fromEnvelopeId: createdEnvelope.body.id, toEnvelopeId: savingsEnvelope.body.id, amountMinor: 15000, note: 'Set aside' })
      .expect(201);
    expect(transfer.body.from.balanceMinor).toBe(35000);
    expect(transfer.body.to.balanceMinor).toBe(15000);

    await request(app.getHttpServer())
      .get(`/groups/${group.id}/envelopes`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.map((envelope: { name: string; balanceMinor: number }) => [envelope.name, envelope.balanceMinor])).toEqual([
          ['Groceries', 35000],
          ['Savings', 15000],
        ]);
      });
  });

  test('rejects transfers that overspend the source envelope', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');

    const source = await request(app.getHttpServer())
      .post(`/groups/${group.id}/envelopes`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Groceries' })
      .expect(201);
    const target = await request(app.getHttpServer())
      .post(`/groups/${group.id}/envelopes`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Savings' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/envelopes/${source.body.id}/funding`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ amountMinor: 1000 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ fromEnvelopeId: source.body.id, toEnvelopeId: target.body.id, amountMinor: 1001 })
      .expect(400)
      .expect(({ body }) => expectErrorCode(body, 'INVALID_INPUT'));
  });
});
