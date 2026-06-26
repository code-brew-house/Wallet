import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import './setup-env';
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

async function createInvite(app: INestApplication, token: string, groupId: string) {
  const response = await request(app.getHttpServer())
    .post(`/groups/${groupId}/invites`)
    .set('Authorization', `Bearer ${token}`)
    .send({ expiresInHours: 24 })
    .expect(201);
  return response.body as { id: string; token: string; groupId: string; status: string };
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

  test('concurrent transfers cannot overspend the source envelope', async () => {
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

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post(`/groups/${group.id}/transfers`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ fromEnvelopeId: source.body.id, toEnvelopeId: target.body.id, amountMinor: 200 }),
      ),
    );

    expect(responses.every((response) => [201, 400].includes(response.status))).toBe(true);
    expect(responses.filter((response) => response.status === 201)).toHaveLength(5);
    for (const response of responses.filter((item) => item.status === 400)) {
      expectErrorCode(response.body, 'INVALID_INPUT');
    }

    await request(app.getHttpServer())
      .get(`/groups/${group.id}/envelopes`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.map((envelope: { name: string; balanceMinor: number }) => [envelope.name, envelope.balanceMinor])).toEqual([
          ['Groceries', 0],
          ['Savings', 1000],
        ]);
      });
  });

  test('rejects transfers within the same envelope', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');

    const envelope = await request(app.getHttpServer())
      .post(`/groups/${group.id}/envelopes`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Groceries' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ fromEnvelopeId: envelope.body.id, toEnvelopeId: envelope.body.id, amountMinor: 100 })
      .expect(400)
      .expect(({ body }) => expectErrorCode(body, 'INVALID_INPUT'));
  });

  test('non-members cannot read or mutate group envelopes', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const outsiderToken = await signup(app, 'outsider@example.com');
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
      .get(`/groups/${group.id}/envelopes`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404)
      .expect(({ body }) => expectErrorCode(body, 'NOT_FOUND'));

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/envelopes`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ name: 'Travel' })
      .expect(404)
      .expect(({ body }) => expectErrorCode(body, 'NOT_FOUND'));

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/envelopes/${source.body.id}/funding`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ amountMinor: 100 })
      .expect(404)
      .expect(({ body }) => expectErrorCode(body, 'NOT_FOUND'));

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/transfers`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ fromEnvelopeId: source.body.id, toEnvelopeId: target.body.id, amountMinor: 100 })
      .expect(404)
      .expect(({ body }) => expectErrorCode(body, 'NOT_FOUND'));
  });

  test('members can read but cannot create, fund, or transfer envelopes', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const memberToken = await signup(app, 'member@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');
    const invite = await createInvite(app, ownerToken, group.id);

    await request(app.getHttpServer())
      .post(`/invites/${invite.token}/accept`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(201);

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
      .get(`/groups/${group.id}/envelopes`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/envelopes`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Travel' })
      .expect(403)
      .expect(({ body }) => expectErrorCode(body, 'FORBIDDEN'));

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/envelopes/${source.body.id}/funding`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ amountMinor: 100 })
      .expect(403)
      .expect(({ body }) => expectErrorCode(body, 'FORBIDDEN'));

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/transfers`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ fromEnvelopeId: source.body.id, toEnvelopeId: target.body.id, amountMinor: 100 })
      .expect(403)
      .expect(({ body }) => expectErrorCode(body, 'FORBIDDEN'));
  });
});
