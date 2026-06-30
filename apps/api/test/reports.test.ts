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
    expect(response.body.group).toEqual({ id: group.id, name: 'Family Wallet' });
  });

  test('returns recent activity in descending pages of ten', async () => {
    const ownerToken = await signup(app, 'activity-owner@example.com');
    const group = await createGroup(app, ownerToken, 'Activity Wallet');
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: 'activity-owner@example.com' } });

    const envelope = await request(app.getHttpServer())
      .post(`/groups/${group.id}/envelopes`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Groceries' })
      .expect(201);

    const base = Date.UTC(2026, 5, 29, 12, 0, 0);
    for (let index = 0; index < 12; index += 1) {
      await prisma.envelopeFunding.create({
        data: {
          groupId: group.id,
          envelopeId: envelope.body.id,
          createdById: owner.id,
          amountMinor: 100 + index,
          note: `Activity ${index}`,
          createdAt: new Date(base + index * 60_000),
        },
      });
    }

    await prisma.expense.create({
      data: {
        groupId: group.id,
        envelopeId: envelope.body.id,
        createdById: owner.id,
        amountMinor: 2500,
        title: 'Backdated groceries',
        spentAt: new Date(base - 24 * 60 * 60 * 1000),
        createdAt: new Date(base + 20 * 60_000),
      },
    });

    await request(app.getHttpServer())
      .get(`/groups/${group.id}/dashboard`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.recentActivity.map((item: { title: string }) => item.title)).toEqual([
          'Backdated groceries',
          'Activity 11',
          'Activity 10',
          'Activity 9',
          'Activity 8',
          'Activity 7',
          'Activity 6',
          'Activity 5',
          'Activity 4',
          'Activity 3',
        ]);
      });

    await request(app.getHttpServer())
      .get(`/groups/${group.id}/activity?offset=10&limit=10`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items.map((item: { title: string }) => item.title)).toEqual(['Activity 2', 'Activity 1', 'Activity 0']);
        expect(body.nextOffset).toBeNull();
      });
  });
  test('returns 404 when the caller is not a member of the requested group', async () => {
    const outsiderToken = await signup(app, 'outsider@example.com');
    const ownerToken = await signup(app, 'owner2@example.com');
    const group = await createGroup(app, ownerToken, 'Hidden Wallet');

    await request(app.getHttpServer())
      .get(`/groups/${group.id}/dashboard`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404);
  });
});
