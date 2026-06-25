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

async function createEnvelope(app: INestApplication, token: string, groupId: string, name = 'Groceries') {
  const response = await request(app.getHttpServer())
    .post(`/groups/${groupId}/envelopes`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name })
    .expect(201);
  return response.body as { id: string; name: string; balanceMinor: number };
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
      .send({ envelopeId: envelope.id, amountMinor: 2500, spentAt: '2026-06-25T12:00:00.000Z', title: 'Vegetables' })
      .expect(201);

    expect(addExpense.body.summary.balanceMinor).toBe(-2500);
    expect(addExpense.body.expense.title).toBe('Vegetables');

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
      })
      .expect(201);

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
