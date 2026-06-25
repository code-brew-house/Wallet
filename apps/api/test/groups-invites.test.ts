import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
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

describe('groups and invites', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.membership.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.membership.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  test('creator becomes group owner', async () => {
    const token = await signup(app, 'owner@example.com');
    const response = await request(app.getHttpServer())
      .post('/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Family Wallet', currency: 'INR' })
      .expect(201);

    expect(response.body.name).toBe('Family Wallet');
    const membership = await prisma.membership.findFirstOrThrow({ where: { groupId: response.body.id } });
    expect(membership.role).toBe('owner');
  });

  test('admin invite link can be accepted by authenticated user', async () => {
    const ownerToken = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'owner@example.com', password: 'StrongPass123!' })
      .then((response) => response.body.accessToken as string);
    const memberToken = await signup(app, 'member@example.com');
    const group = await prisma.group.findFirstOrThrow({ where: { name: 'Family Wallet' } });

    const invite = await request(app.getHttpServer())
      .post(`/groups/${group.id}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ expiresInHours: 24 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/invites/${invite.body.token}/accept`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(201)
      .expect(({ body }) => expect(body.groupId).toBe(group.id));
  });
});
