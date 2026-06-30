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

async function createInvite(app: INestApplication, token: string, groupId: string, expiresInHours = 24) {
  const response = await request(app.getHttpServer())
    .post(`/groups/${groupId}/invites`)
    .set('Authorization', `Bearer ${token}`)
    .send({ expiresInHours })
    .expect(201);
  return response.body as { id: string; token: string; groupId: string; status: string };
}

function expectErrorCode(body: { code?: string; response?: { code?: string } }, code: string) {
  expect(body.response?.code ?? body.code).toBe(code);
}

describe('groups and invites', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.invite.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.invite.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  test('creator becomes group owner and sees only their groups', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const otherToken = await signup(app, 'other-owner@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');
    await createGroup(app, otherToken, 'Other Wallet');

    const membership = await prisma.membership.findFirstOrThrow({ where: { groupId: group.id } });
    expect(membership.role).toBe('owner');

    await request(app.getHttpServer())
      .get('/groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.map((item: { id: string }) => item.id)).toEqual([group.id]);
      });
  });

  test('members endpoint returns group members and hides the group from non-members', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const memberToken = await signup(app, 'member@example.com');
    const outsiderToken = await signup(app, 'outsider@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');
    const invite = await createInvite(app, ownerToken, group.id);

    await request(app.getHttpServer())
      .post(`/invites/${invite.token}/accept`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .get(`/groups/${group.id}/members`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(2);
        expect(body.map((member: { user: { email: string }; role: string }) => [member.user.email, member.role])).toEqual([
          ['owner@example.com', 'owner'],
          ['member@example.com', 'member'],
        ]);
      });

    await request(app.getHttpServer())
      .get(`/groups/${group.id}/members`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404)
      .expect(({ body }) => expectErrorCode(body, 'NOT_FOUND'));
  });

  test('active invite link is shareable until expiry or revocation and already-member acceptance is idempotent', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const firstMemberToken = await signup(app, 'first@example.com');
    const secondMemberToken = await signup(app, 'second@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');
    const invite = await createInvite(app, ownerToken, group.id);
    expect(invite.token).toHaveLength(5);
    expect(invite.token).toMatch(/^[A-Z0-9]{5}$/);


    await request(app.getHttpServer())
      .post(`/invites/${invite.token}/accept`)
      .set('Authorization', `Bearer ${firstMemberToken}`)
      .expect(201)
      .expect(({ body }) => {
        expect(body.groupId).toBe(group.id);
        expect(body.role).toBe('member');
      });

    await request(app.getHttpServer())
      .post(`/invites/${invite.token}/accept`)
      .set('Authorization', `Bearer ${secondMemberToken}`)
      .expect(201)
      .expect(({ body }) => {
        expect(body.groupId).toBe(group.id);
        expect(body.role).toBe('member');
      });

    await request(app.getHttpServer())
      .post(`/invites/${invite.token}/accept`)
      .set('Authorization', `Bearer ${firstMemberToken}`)
      .expect(201)
      .expect(({ body }) => {
        expect(body.groupId).toBe(group.id);
        expect(body.role).toBe('member');
      });

    const storedInvite = await prisma.invite.findUniqueOrThrow({ where: { id: invite.id } });
    expect(storedInvite.status).toBe('active');
    expect(await prisma.membership.count({ where: { groupId: group.id } })).toBe(3);
  });

  test('revoked, expired, and unknown invite tokens are rejected', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const memberToken = await signup(app, 'member@example.com');
    const expiredMemberToken = await signup(app, 'expired@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');
    const revoked = await createInvite(app, ownerToken, group.id);
    const expired = await createInvite(app, ownerToken, group.id);

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/invites/${revoked.id}/revoke`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201)
      .expect(({ body }) => expect(body.status).toBe('revoked'));

    await prisma.invite.update({
      where: { id: expired.id },
      data: { expiresAt: new Date(Date.now() - 60_000), status: 'expired' },
    });

    await request(app.getHttpServer())
      .post(`/invites/${revoked.token}/accept`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(404)
      .expect(({ body }) => expectErrorCode(body, 'NOT_FOUND'));

    await request(app.getHttpServer())
      .post(`/invites/${expired.token}/accept`)
      .set('Authorization', `Bearer ${expiredMemberToken}`)
      .expect(404)
      .expect(({ body }) => expectErrorCode(body, 'NOT_FOUND'));

    await request(app.getHttpServer())
      .post('/invites/not-a-real-token/accept')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(404)
      .expect(({ body }) => expectErrorCode(body, 'NOT_FOUND'));
  });

  test('only admins and owners can create or revoke invites', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const memberToken = await signup(app, 'member@example.com');
    const outsiderToken = await signup(app, 'outsider@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');
    const invite = await createInvite(app, ownerToken, group.id);

    await request(app.getHttpServer())
      .post(`/invites/${invite.token}/accept`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/invites`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ expiresInHours: 24 })
      .expect(403)
      .expect(({ body }) => expectErrorCode(body, 'FORBIDDEN'));

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/invites`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ expiresInHours: 24 })
      .expect(404)
      .expect(({ body }) => expectErrorCode(body, 'NOT_FOUND'));

    await request(app.getHttpServer())
      .post(`/groups/${group.id}/invites/${invite.id}/revoke`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403)
      .expect(({ body }) => expectErrorCode(body, 'FORBIDDEN'));
  });

  test('role changes allow owner-managed member updates but never owner demotion', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const memberToken = await signup(app, 'member@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');
    const invite = await createInvite(app, ownerToken, group.id);

    await request(app.getHttpServer())
      .post(`/invites/${invite.token}/accept`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(201);
    const member = await prisma.user.findUniqueOrThrow({ where: { email: 'member@example.com' } });
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: 'owner@example.com' } });

    await request(app.getHttpServer())
      .patch(`/groups/${group.id}/members/${member.id}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'admin' })
      .expect(200)
      .expect(({ body }) => expect(body.role).toBe('admin'));

    await request(app.getHttpServer())
      .patch(`/groups/${group.id}/members/${owner.id}/role`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ role: 'member' })
      .expect(403)
      .expect(({ body }) => expectErrorCode(body, 'FORBIDDEN'));

    const ownerMembership = await prisma.membership.findUniqueOrThrow({
      where: { groupId_userId: { groupId: group.id, userId: owner.id } },
    });
    expect(ownerMembership.role).toBe('owner');
  });

  test('non-admins and non-members cannot change roles', async () => {
    const ownerToken = await signup(app, 'owner@example.com');
    const memberToken = await signup(app, 'member@example.com');
    const outsiderToken = await signup(app, 'outsider@example.com');
    const group = await createGroup(app, ownerToken, 'Family Wallet');
    const invite = await createInvite(app, ownerToken, group.id);

    await request(app.getHttpServer())
      .post(`/invites/${invite.token}/accept`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(201);
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: 'owner@example.com' } });

    await request(app.getHttpServer())
      .patch(`/groups/${group.id}/members/${owner.id}/role`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ role: 'member' })
      .expect(403)
      .expect(({ body }) => expectErrorCode(body, 'FORBIDDEN'));

    await request(app.getHttpServer())
      .patch(`/groups/${group.id}/members/${owner.id}/role`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ role: 'member' })
      .expect(404)
      .expect(({ body }) => expectErrorCode(body, 'NOT_FOUND'));
  });
});
