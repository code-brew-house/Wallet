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

async function createEnvelope(app: INestApplication, token: string, groupId: string, name = 'Groceries') {
  const response = await request(app.getHttpServer())
    .post(`/groups/${groupId}/envelopes`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name })
    .expect(201);
  return response.body as { id: string; name: string; balanceMinor: number };
}

async function createInvite(app: INestApplication, token: string, groupId: string) {
  const response = await request(app.getHttpServer())
    .post(`/groups/${groupId}/invites`)
    .set('Authorization', `Bearer ${token}`)
    .send({ expiresInHours: 24 })
    .expect(201);
  return response.body as { id: string; token: string; groupId: string; status: string };
}

async function acceptInvite(app: INestApplication, token: string, inviteToken: string) {
  await request(app.getHttpServer()).post(`/invites/${inviteToken}/accept`).set('Authorization', `Bearer ${token}`).expect(201);
}

async function createExpense(app: INestApplication, token: string, groupId: string, envelopeId: string, title = 'Vegetables') {
  const response = await request(app.getHttpServer())
    .post(`/groups/${groupId}/expenses`)
    .set('Authorization', `Bearer ${token}`)
    .send({ envelopeId, amountMinor: 2500, spentAt: '2026-06-25T12:00:00.000Z', title })
    .expect(201);
  return response.body as { expense: { id: string; createdById: string }; summary: { balanceMinor: number } };
}

function expectErrorCode(body: { code?: string; response?: { code?: string } }, code: string) {
  expect(body.code ?? body.response?.code).toBe(code);
}

describe('expenses and recurring expenses', () => {
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

  test('allows expenses to overspend envelopes and soft-deletes them', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');
    const envelope = await createEnvelope(app, ownerToken, group.id, 'Groceries');

    const addExpense = await request(app.getHttpServer())
      .post(`/groups/${group.id}/expenses`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ envelopeId: envelope.id, amountMinor: 2500, spentAt: '2026-06-25T12:00:00.000Z', title: 'Vegetables', note: '' })
      .expect(201);

    expect(addExpense.body.summary.balanceMinor).toBe(-2500);
    expect(addExpense.body.expense.title).toBe('Vegetables');
    expect(addExpense.body.expense.note).toBeNull();

    await request(app.getHttpServer())
      .get(`/groups/${group.id}/expenses`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].title).toBe('Vegetables');
      });

    const deleted = await request(app.getHttpServer())
      .delete(`/groups/${group.id}/expenses/${addExpense.body.expense.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(deleted.body.deleted).toBe(true);
    expect(deleted.body.summary.balanceMinor).toBe(0);

    const storedExpense = await prisma.expense.findUniqueOrThrow({ where: { id: addExpense.body.expense.id } });
    expect(storedExpense.deletedAt).toBeInstanceOf(Date);
  });

  test('rejects non-members from reading, creating, or deleting group expenses', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const outsiderToken = await signup(app, 'outsider@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');
    const envelope = await createEnvelope(app, ownerToken, group.id, 'Groceries');
    const expense = await createExpense(app, ownerToken, group.id, envelope.id);

    await request(app.getHttpServer())
      .get(`/groups/${group.id}/expenses`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404)
      .expect(({ body }) => expectErrorCode(body, 'NOT_FOUND'));

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/expenses`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ envelopeId: envelope.id, amountMinor: 1200, spentAt: '2026-06-25T12:00:00.000Z', title: 'Snacks' })
      .expect(404)
      .expect(({ body }) => expectErrorCode(body, 'NOT_FOUND'));

    await request(app.getHttpServer())
      .delete(`/groups/${group.id}/expenses/${expense.expense.id}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404)
      .expect(({ body }) => expectErrorCode(body, 'NOT_FOUND'));
  });

  test('members can delete expenses they created', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const memberToken = await signup(app, 'member@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');
    const invite = await createInvite(app, ownerToken, group.id);
    await acceptInvite(app, memberToken, invite.token);
    const envelope = await createEnvelope(app, ownerToken, group.id, 'Groceries');
    const expense = await createExpense(app, memberToken, group.id, envelope.id);

    const deleted = await request(app.getHttpServer())
      .delete(`/groups/${group.id}/expenses/${expense.expense.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(deleted.body.deleted).toBe(true);
    expect(deleted.body.summary.balanceMinor).toBe(0);
  });

  test('members cannot delete another members expense', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const firstMemberToken = await signup(app, 'first.member@example.com');
    const secondMemberToken = await signup(app, 'second.member@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');
    await acceptInvite(app, firstMemberToken, (await createInvite(app, ownerToken, group.id)).token);
    await acceptInvite(app, secondMemberToken, (await createInvite(app, ownerToken, group.id)).token);
    const envelope = await createEnvelope(app, ownerToken, group.id, 'Groceries');
    const expense = await createExpense(app, firstMemberToken, group.id, envelope.id);

    await request(app.getHttpServer())
      .delete(`/groups/${group.id}/expenses/${expense.expense.id}`)
      .set('Authorization', `Bearer ${secondMemberToken}`)
      .expect(403)
      .expect(({ body }) => expectErrorCode(body, 'FORBIDDEN'));

    const storedExpense = await prisma.expense.findUniqueOrThrow({ where: { id: expense.expense.id } });
    expect(storedExpense.deletedAt).toBeNull();
  });

  test('owners and admins can delete another members expense', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const adminToken = await signup(app, 'admin@example.com');
    const memberToken = await signup(app, 'member@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');
    await acceptInvite(app, adminToken, (await createInvite(app, ownerToken, group.id)).token);
    await acceptInvite(app, memberToken, (await createInvite(app, ownerToken, group.id)).token);
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });
    await request(app.getHttpServer())
      .patch(`/groups/${group.id}/members/${admin.id}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'admin' })
      .expect(200);
    const envelope = await createEnvelope(app, ownerToken, group.id, 'Groceries');

    const ownerDeletedExpense = await createExpense(app, memberToken, group.id, envelope.id, 'Owner delete target');
    await request(app.getHttpServer())
      .delete(`/groups/${group.id}/expenses/${ownerDeletedExpense.expense.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.deleted).toBe(true));

    const adminDeletedExpense = await createExpense(app, memberToken, group.id, envelope.id, 'Admin delete target');
    await request(app.getHttpServer())
      .delete(`/groups/${group.id}/expenses/${adminDeletedExpense.expense.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.deleted).toBe(true));
  });

  test('creates upcoming recurring expenses and confirms one into an expense', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');
    const envelope = await createEnvelope(app, ownerToken, group.id, 'Rent');

    const recurring = await request(app.getHttpServer())
      .post(`/groups/${group.id}/recurring-expenses`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        envelopeId: envelope.id,
        amountMinor: 40000,
        title: 'Rent',
        frequency: 'monthly',
        nextDueAt: '2026-07-01T00:00:00.000Z',
        note: '',
      })
      .expect(201);
    expect(recurring.body.note).toBeNull();

    const upcoming = await request(app.getHttpServer())
      .get(`/groups/${group.id}/recurring-expenses/upcoming`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(upcoming.body[0].title).toBe('Rent');

    const confirm = await request(app.getHttpServer())
      .post(`/groups/${group.id}/recurring-expenses/${recurring.body.id}/confirm`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);

    expect(confirm.body.expense.title).toBe('Rent');
    expect(confirm.body.nextDueAt).toBe('2026-08-01T00:00:00.000Z');
  });
});
