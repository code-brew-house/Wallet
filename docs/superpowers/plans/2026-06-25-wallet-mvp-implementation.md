# Wallet MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Wallet MVP as a Bun-managed Next.js PWA plus NestJS API for group-based persistent envelope budgeting on PostgreSQL.

**Architecture:** Use a Bun workspace with `apps/web`, `apps/api`, and `packages/shared`. The Next.js App Router frontend owns UI, PWA installability, offline read-only display, and calls the NestJS REST API. The NestJS API owns auth, group permissions, envelope ledger rules, recurring expenses, reports, Prisma migrations, and PostgreSQL access.

**Tech Stack:** Bun workspace, TypeScript, Next.js App Router, Mantine, Workbox service worker, NestJS, Prisma ORM, PostgreSQL, Zod for environment validation, class-validator DTO validation, Bun test runner, Docker/Coolify.

## Global Constraints

- Use Bun as the package manager, script runner, test runner, and default JavaScript runtime.
- Use a Bun workspace with one root lockfile.
- Use Next.js App Router and Mantine for the PWA frontend.
- Use NestJS REST API backed by PostgreSQL for all product data.
- The frontend must not connect directly to PostgreSQL.
- Use persistent envelopes with carry-forward balances, not monthly budgets.
- Store money as integer minor units. Never store or calculate money as floating-point values.
- Each group has one currency.
- Invite links are shareable, expiring, and revocable.
- Roles are owner, admin, and member.
- The PWA supports offline read-only cached screens only. Offline writes are out of scope.
- Bank sync, debt settlement, multi-currency groups, and the React Native app are out of scope.
- Use Coolify with separate frontend, API, and PostgreSQL services.
- Use `bun install --frozen-lockfile` in application service builds.
- Do not add compatibility shims for future mobile; keep the API clean enough for future reuse.

---

## Planned File Structure

```text
.
├── .dockerignore
├── .env.example
├── .gitignore
├── bunfig.toml
├── docker-compose.test.yml
├── package.json
├── tsconfig.base.json
├── apps
│   ├── api
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── prisma
│   │   │   └── schema.prisma
│   │   ├── src
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts
│   │   │   ├── auth
│   │   │   ├── common
│   │   │   ├── config
│   │   │   ├── envelopes
│   │   │   ├── expenses
│   │   │   ├── groups
│   │   │   ├── health
│   │   │   ├── invites
│   │   │   ├── memberships
│   │   │   ├── prisma
│   │   │   ├── recurring-expenses
│   │   │   └── reports
│   │   └── test
│   │       ├── helpers
│   │       └── *.test.ts
│   ├── web
│   │   ├── Dockerfile
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   ├── public
│   │   │   ├── manifest.webmanifest
│   │   │   ├── sw.js
│   │   │   └── icons
│   │   ├── src
│   │   │   ├── app
│   │   │   ├── components
│   │   │   ├── features
│   │   │   ├── lib
│   │   │   └── styles
│   │   └── test
│   └── smoke
│       ├── package.json
│       └── coolify-smoke.test.ts
└── packages
    └── shared
        ├── package.json
        └── src
            ├── api.ts
            ├── money.ts
            ├── roles.ts
            └── index.ts
```

Responsibilities:

- `packages/shared`: API DTO types, role constants, and money helpers shared by web and API. No database code.
- `apps/api/src/auth`: signup, login, refresh, logout, password hashing, JWT access tokens, refresh cookies.
- `apps/api/src/groups`, `memberships`, `invites`: group lifecycle, role checks, invite acceptance.
- `apps/api/src/envelopes`: envelope creation, funding, transfers, balance summaries.
- `apps/api/src/expenses`: manual expenses and soft delete/reversal behavior.
- `apps/api/src/recurring-expenses`: recurring expense definitions and confirmation into real expenses.
- `apps/api/src/reports`: read-only summaries.
- `apps/web/src/features`: route-level UI features grouped by product area.
- `apps/web/public/sw.js`: Workbox service worker for read-only response caching.
- `apps/smoke`: deployed service smoke tests.

---

### Task 1: Bun Workspace Foundation

**Files:**
- Create: `.gitignore`
- Create: `.dockerignore`
- Create: `.env.example`
- Create: `bunfig.toml`
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/src/roles.ts`
- Create: `packages/shared/src/money.ts`
- Create: `packages/shared/src/api.ts`
- Create: `packages/shared/src/index.ts`
- Test: `packages/shared/src/money.test.ts`

**Interfaces:**
- Produces: `Role`, `MoneyMinor`, `formatMoneyMinor(amountMinor, currency)`, `assertPositiveMinorUnit(amountMinor)`, `ApiErrorBody`.
- Consumes: none.

- [ ] **Step 1: Write the failing money helper test**

Create `packages/shared/src/money.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { assertPositiveMinorUnit, formatMoneyMinor } from './money';

describe('money helpers', () => {
  test('formats integer minor units without floating point input', () => {
    expect(formatMoneyMinor(123456, 'INR')).toBe('₹1,234.56');
  });

  test('rejects non-positive or fractional minor-unit amounts', () => {
    expect(() => assertPositiveMinorUnit(0)).toThrow('amountMinor must be a positive integer');
    expect(() => assertPositiveMinorUnit(10.5)).toThrow('amountMinor must be a positive integer');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/shared/src/money.test.ts`

Expected: FAIL with `Cannot find module './money'`.

- [ ] **Step 3: Create the workspace files**

Create `.gitignore`:

```gitignore
node_modules/
.bun-install-cache/
.next/
dist/
coverage/
.env
.env.*
!.env.example
.superpowers/
.DS_Store
apps/api/prisma/migrations/dev.db
```

Create `.dockerignore`:

```dockerignore
node_modules
.bun-install-cache
.git
.superpowers
.next
coverage
.env
.env.*
```

Create `.env.example`:

```dotenv
DATABASE_URL=postgresql://wallet:wallet@localhost:5432/wallet
API_PORT=4000
API_PUBLIC_URL=http://localhost:4000
WEB_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
JWT_ACCESS_SECRET=replace-with-32-byte-random-value
JWT_REFRESH_SECRET=replace-with-32-byte-random-value
COOKIE_DOMAIN=localhost
NODE_ENV=development
```

Create `bunfig.toml`:

```toml
[test]
coverage = false
```

Create root `package.json`:

```json
{
  "name": "wallet",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "build": "bun run --filter '*' build",
    "test": "bun test",
    "typecheck": "bun run --filter '*' typecheck",
    "db:migrate": "bun --cwd apps/api prisma migrate dev",
    "db:deploy": "bun --cwd apps/api prisma migrate deploy"
  },
  "devDependencies": {
    "typescript": "latest"
  }
}
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@wallet/shared": ["packages/shared/src/index.ts"]
    }
  }
}
```

Create `packages/shared/package.json`:

```json
{
  "name": "@wallet/shared",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "bun test src/*.test.ts",
    "test": "bun test src/*.test.ts",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "devDependencies": {
    "typescript": "latest"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: Implement shared primitives**

Create `packages/shared/src/roles.ts`:

```ts
export const roles = ['owner', 'admin', 'member'] as const;
export type Role = (typeof roles)[number];

export function canManageGroup(role: Role): boolean {
  return role === 'owner' || role === 'admin';
}
```

Create `packages/shared/src/money.ts`:

```ts
export type MoneyMinor = number;

export function assertPositiveMinorUnit(amountMinor: number): asserts amountMinor is MoneyMinor {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('amountMinor must be a positive integer');
  }
}

export function formatMoneyMinor(amountMinor: MoneyMinor, currency: string): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amountMinor / 100);
}
```

Create `packages/shared/src/api.ts`:

```ts
export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'LOGIN_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVITE_EXPIRED'
  | 'INVITE_REVOKED'
  | 'NOT_FOUND'
  | 'STALE_OFFLINE_DATA'
  | 'DEPENDENCY_UNAVAILABLE';

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, string[]>;
}
```

Create `packages/shared/src/index.ts`:

```ts
export * from './api';
export * from './money';
export * from './roles';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test packages/shared/src/money.test.ts`

Expected: PASS, 2 tests.

- [ ] **Step 6: Install dependencies and typecheck shared package**

Run: `bun install`

Expected: creates `bun.lock` and exits 0.

Run: `bun run --filter @wallet/shared typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add .gitignore .dockerignore .env.example bunfig.toml package.json bun.lock tsconfig.base.json packages/shared
git commit -m "chore: scaffold Bun workspace"
```

---

### Task 2: API Foundation, Config, and Health

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Test: `apps/api/test/health.test.ts`

**Interfaces:**
- Consumes: `ApiErrorBody` from `@wallet/shared`.
- Produces: `GET /health` returns `{ status: 'ok'; service: 'wallet-api' }`.
- Produces: `env` object with `DATABASE_URL`, `API_PORT`, `WEB_PUBLIC_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_DOMAIN`, `NODE_ENV`.

- [ ] **Step 1: Write the failing health test**

Create `apps/api/test/health.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://wallet:wallet@localhost:5432/wallet';
    process.env.API_PORT = '4000';
    process.env.WEB_PUBLIC_URL = 'http://localhost:3000';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-test-refresh-secret';
    process.env.COOKIE_DOMAIN = 'localhost';
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test apps/api/test/health.test.ts`

Expected: FAIL with `Cannot find package '@nestjs/common'` or `Cannot find module '../src/app.module'`.

- [ ] **Step 3: Create API package and TypeScript config**

Create `apps/api/package.json`:

```json
{
  "name": "@wallet/api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --hot src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "bun src/main.ts",
    "test": "bun test test/*.test.ts",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "prisma": "prisma"
  },
  "dependencies": {
    "@nestjs/common": "latest",
    "@nestjs/core": "latest",
    "@nestjs/platform-express": "latest",
    "@wallet/shared": "workspace:*",
    "reflect-metadata": "latest",
    "rxjs": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@nestjs/testing": "latest",
    "@types/supertest": "latest",
    "supertest": "latest",
    "typescript": "latest"
  }
}
```

Create `apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

- [ ] **Step 4: Implement validated config and health endpoint**

Create `apps/api/src/config/env.ts`:

```ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_PUBLIC_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  COOKIE_DOMAIN: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
```

Create `apps/api/src/health/health.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { status: 'ok'; service: 'wallet-api' } {
    return { status: 'ok', service: 'wallet-api' };
  }
}
```

Create `apps/api/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';

@Module({
  controllers: [HealthController],
})
export class AppModule {}
```

Create `apps/api/src/main.ts`:

```ts
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { env } from './config/env';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: env.WEB_PUBLIC_URL, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(env.API_PORT);
}

void bootstrap();
```

- [ ] **Step 5: Install and run the health test**

Run: `bun install`

Expected: exits 0.

Run: `bun test apps/api/test/health.test.ts`

Expected: PASS, 1 test.

- [ ] **Step 6: Typecheck API**

Run: `bun run --filter @wallet/api typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add package.json bun.lock apps/api
git commit -m "feat(api): add NestJS health endpoint"
```

---

### Task 3: PostgreSQL Schema and Prisma Service

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `docker-compose.test.yml`
- Test: `apps/api/test/prisma-schema.test.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` from env.
- Produces: `PrismaService` injectable.
- Produces: Prisma models `User`, `Group`, `Membership`, `Invite`, `Envelope`, `EnvelopeFunding`, `EnvelopeTransfer`, `Expense`, `RecurringExpense`.
- Produces: Prisma enums `MembershipRole`, `InviteStatus`, `RecurringFrequency`.

- [ ] **Step 1: Write the failing schema contract test**

Create `apps/api/test/prisma-schema.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');

describe('Prisma schema', () => {
  test('defines all MVP tables and integer minor-unit money fields', () => {
    for (const model of [
      'User',
      'Group',
      'Membership',
      'Invite',
      'Envelope',
      'EnvelopeFunding',
      'EnvelopeTransfer',
      'Expense',
      'RecurringExpense',
    ]) {
      expect(schema).toContain(`model ${model}`);
    }

    expect(schema).toContain('amountMinor Int');
    expect(schema).not.toContain('Float');
    expect(schema).not.toContain('Decimal');
  });
});
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run: `bun test apps/api/test/prisma-schema.test.ts`

Expected: FAIL with missing `schema.prisma`.

- [ ] **Step 3: Add Prisma dependencies and test PostgreSQL compose file**

Modify `apps/api/package.json` dependencies:

```json
{
  "dependencies": {
    "@nestjs/common": "latest",
    "@nestjs/core": "latest",
    "@nestjs/platform-express": "latest",
    "@prisma/adapter-pg": "latest",
    "@prisma/client": "latest",
    "@wallet/shared": "workspace:*",
    "pg": "latest",
    "reflect-metadata": "latest",
    "rxjs": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@nestjs/testing": "latest",
    "@types/pg": "latest",
    "@types/supertest": "latest",
    "prisma": "latest",
    "supertest": "latest",
    "typescript": "latest"
  }
}
```

Create `docker-compose.test.yml`:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: wallet
      POSTGRES_PASSWORD: wallet
      POSTGRES_DB: wallet
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wallet -d wallet"]
      interval: 2s
      timeout: 2s
      retries: 20
```

- [ ] **Step 4: Create Prisma schema**

Create `apps/api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum MembershipRole {
  owner
  admin
  member
}

enum InviteStatus {
  active
  revoked
  accepted
  expired
}

enum RecurringFrequency {
  weekly
  monthly
  yearly
}

model User {
  id             String            @id @default(uuid())
  email          String            @unique
  passwordHash   String
  displayName    String
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  memberships    Membership[]
  createdGroups  Group[]           @relation("CreatedGroups")
  fundingEntries EnvelopeFunding[]
  expenses       Expense[]
}

model Group {
  id              String             @id @default(uuid())
  name            String
  currency        String
  createdById     String
  createdBy       User               @relation("CreatedGroups", fields: [createdById], references: [id])
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  memberships     Membership[]
  invites         Invite[]
  envelopes       Envelope[]
  fundingEntries  EnvelopeFunding[]
  transfers       EnvelopeTransfer[]
  expenses        Expense[]
  recurring       RecurringExpense[]

  @@index([createdById])
}

model Membership {
  id        String         @id @default(uuid())
  groupId   String
  userId    String
  role      MembershipRole
  createdAt DateTime       @default(now())
  group     Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
  @@index([userId])
}

model Invite {
  id         String       @id @default(uuid())
  tokenHash  String       @unique
  groupId    String
  createdById String
  status     InviteStatus @default(active)
  expiresAt  DateTime
  acceptedById String?
  acceptedAt DateTime?
  revokedAt  DateTime?
  createdAt  DateTime     @default(now())
  group      Group        @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@index([groupId, status])
  @@index([expiresAt])
}

model Envelope {
  id          String             @id @default(uuid())
  groupId     String
  name        String
  archivedAt  DateTime?
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  group       Group              @relation(fields: [groupId], references: [id], onDelete: Cascade)
  funding     EnvelopeFunding[]
  incoming    EnvelopeTransfer[] @relation("TransferToEnvelope")
  outgoing    EnvelopeTransfer[] @relation("TransferFromEnvelope")
  expenses    Expense[]
  recurring   RecurringExpense[]

  @@unique([groupId, name])
  @@index([groupId, archivedAt])
}

model EnvelopeFunding {
  id          String    @id @default(uuid())
  groupId     String
  envelopeId  String
  amountMinor Int
  note        String?
  createdById String
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  group       Group     @relation(fields: [groupId], references: [id], onDelete: Cascade)
  envelope    Envelope  @relation(fields: [envelopeId], references: [id], onDelete: Cascade)
  createdBy   User      @relation(fields: [createdById], references: [id])

  @@index([groupId, envelopeId, deletedAt])
}

model EnvelopeTransfer {
  id             String   @id @default(uuid())
  groupId        String
  fromEnvelopeId String
  toEnvelopeId   String
  amountMinor    Int
  note           String?
  createdById    String
  deletedAt      DateTime?
  createdAt      DateTime @default(now())
  group          Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  fromEnvelope   Envelope @relation("TransferFromEnvelope", fields: [fromEnvelopeId], references: [id])
  toEnvelope     Envelope @relation("TransferToEnvelope", fields: [toEnvelopeId], references: [id])

  @@index([groupId, fromEnvelopeId, deletedAt])
  @@index([groupId, toEnvelopeId, deletedAt])
}

model Expense {
  id          String    @id @default(uuid())
  groupId     String
  envelopeId  String
  amountMinor Int
  spentAt      DateTime
  title       String
  note        String?
  createdById String
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  group       Group     @relation(fields: [groupId], references: [id], onDelete: Cascade)
  envelope    Envelope  @relation(fields: [envelopeId], references: [id])
  createdBy   User      @relation(fields: [createdById], references: [id])

  @@index([groupId, spentAt])
  @@index([groupId, envelopeId, deletedAt])
}

model RecurringExpense {
  id          String             @id @default(uuid())
  groupId     String
  envelopeId  String
  amountMinor Int
  title       String
  frequency   RecurringFrequency
  nextDueAt   DateTime
  note        String?
  active      Boolean            @default(true)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  group       Group              @relation(fields: [groupId], references: [id], onDelete: Cascade)
  envelope    Envelope           @relation(fields: [envelopeId], references: [id])

  @@index([groupId, nextDueAt, active])
}
```

- [ ] **Step 5: Create Prisma service module**

Create `apps/api/src/prisma/prisma.service.ts`:

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { env } from '../config/env';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

Create `apps/api/src/prisma/prisma.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 6: Generate Prisma client and run schema test**

Run: `bun install`

Expected: exits 0.

Run: `bun --cwd apps/api prisma generate`

Expected: generated client under `apps/api/src/generated/prisma`.

Run: `bun test apps/api/test/prisma-schema.test.ts`

Expected: PASS, 1 test.

- [ ] **Step 7: Create initial migration against local PostgreSQL**

Run: `docker compose -f docker-compose.test.yml up -d postgres`

Expected: PostgreSQL container healthy.

Run: `bun --cwd apps/api prisma migrate dev --name init`

Expected: creates `apps/api/prisma/migrations/<timestamp>_init/migration.sql` and applies it.

- [ ] **Step 8: Typecheck API**

Run: `bun run --filter @wallet/api typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add package.json bun.lock docker-compose.test.yml apps/api/package.json apps/api/prisma apps/api/src/prisma apps/api/src/generated
git commit -m "feat(api): add Prisma PostgreSQL schema"
```

---

### Task 4: Authentication and Session API

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/current-user.ts`
- Create: `apps/api/src/auth/jwt-auth.guard.ts`
- Create: `apps/api/src/auth/dto.ts`
- Test: `apps/api/test/auth.test.ts`

**Interfaces:**
- Produces: `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- Produces: `CurrentUser = { id: string; email: string; displayName: string }`.
- Consumes: Prisma `User` model.
- Produces: refresh token HTTP-only cookie named `wallet_refresh`.

- [ ] **Step 1: Write failing auth integration tests**

Create `apps/api/test/auth.test.ts`:

```ts
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
```

- [ ] **Step 2: Run auth tests to verify they fail**

Run: `bun test apps/api/test/auth.test.ts`

Expected: FAIL with missing `AuthModule` or 404 routes.

- [ ] **Step 3: Add auth dependencies**

Modify `apps/api/package.json` dependencies:

```json
{
  "dependencies": {
    "@nestjs/jwt": "latest",
    "argon2": "latest",
    "class-transformer": "latest",
    "class-validator": "latest",
    "cookie-parser": "latest"
  },
  "devDependencies": {
    "@types/cookie-parser": "latest"
  }
}
```

Keep the dependencies from earlier tasks.

- [ ] **Step 4: Implement auth DTOs and current user helpers**

Create `apps/api/src/auth/dto.ts`:

```ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  displayName!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
```

Create `apps/api/src/auth/current-user.ts`:

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
}

export const CurrentUserParam = createParamDecorator((_data: unknown, ctx: ExecutionContext): CurrentUser => {
  const request = ctx.switchToHttp().getRequest<{ user: CurrentUser }>();
  return request.user;
});
```

- [ ] **Step 5: Implement auth service, guard, controller, and module**

Create `apps/api/src/auth/auth.service.ts` with methods:

```ts
export interface AuthResponse {
  user: { id: string; email: string; displayName: string };
  accessToken: string;
}

export class AuthService {
  async signup(dto: SignupDto): Promise<AuthResponse>;
  async login(dto: LoginDto): Promise<AuthResponse>;
  async verifyAccessToken(token: string): Promise<CurrentUser>;
  async refresh(refreshToken: string): Promise<AuthResponse>;
}
```

Implementation requirements:

```ts
// password hash
const passwordHash = await argon2.hash(dto.password);

// password verify
const valid = await argon2.verify(user.passwordHash, dto.password);

// access token payload
const payload = { sub: user.id, email: user.email, displayName: user.displayName };
```

Create `apps/api/src/auth/jwt-auth.guard.ts`:

```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: unknown }>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;
    if (!token) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    request.user = await this.authService.verifyAccessToken(token);
    return true;
  }
}
```

Create controller routes with cookie behavior:

```ts
@Post('signup')
async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) response: Response): Promise<AuthResponse>

@Post('login')
async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response): Promise<AuthResponse>

@Get('me')
@UseGuards(JwtAuthGuard)
async me(@CurrentUserParam() user: CurrentUser): Promise<CurrentUser>
```

Set refresh cookie options:

```ts
{
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/auth/refresh',
  domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
}
```

Modify `apps/api/src/app.module.ts` to import `PrismaModule` and `AuthModule`.

Modify `apps/api/src/main.ts` to call `app.use(cookieParser())` before routes.

- [ ] **Step 6: Run auth tests**

Run: `bun test apps/api/test/auth.test.ts`

Expected: PASS, 3 tests.

- [ ] **Step 7: Run health test regression**

Run: `bun test apps/api/test/health.test.ts`

Expected: PASS, 1 test.

- [ ] **Step 8: Commit**

```bash
git add package.json bun.lock apps/api
git commit -m "feat(api): add email password auth"
```

---

### Task 5: Groups, Memberships, and Invite Links

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/groups/groups.module.ts`
- Create: `apps/api/src/groups/groups.controller.ts`
- Create: `apps/api/src/groups/groups.service.ts`
- Create: `apps/api/src/groups/dto.ts`
- Create: `apps/api/src/memberships/membership.service.ts`
- Create: `apps/api/src/invites/invites.controller.ts`
- Create: `apps/api/src/invites/invites.service.ts`
- Create: `apps/api/src/invites/dto.ts`
- Test: `apps/api/test/groups-invites.test.ts`

**Interfaces:**
- Consumes: `CurrentUser`, `JwtAuthGuard`, `PrismaService`.
- Produces: `POST /groups`, `GET /groups`, `GET /groups/:groupId/members`, `PATCH /groups/:groupId/members/:userId/role`, `POST /groups/:groupId/invites`, `POST /invites/:token/accept`, `POST /groups/:groupId/invites/:inviteId/revoke`.
- Produces: `MembershipService.requireMembership(userId, groupId)` and `MembershipService.requireRole(userId, groupId, ['owner', 'admin'])`.

- [ ] **Step 1: Write failing group and invite tests**

Create `apps/api/test/groups-invites.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify routes fail**

Run: `bun test apps/api/test/groups-invites.test.ts`

Expected: FAIL with 404 for `/groups`.

- [ ] **Step 3: Implement DTOs**

Create `apps/api/src/groups/dto.ts`:

```ts
import { IsIn, IsString, Length } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsIn(['INR', 'USD', 'EUR', 'GBP'])
  currency!: string;
}

export class ChangeRoleDto {
  @IsIn(['admin', 'member'])
  role!: 'admin' | 'member';
}
```

Create `apps/api/src/invites/dto.ts`:

```ts
import { IsInt, Max, Min } from 'class-validator';

export class CreateInviteDto {
  @IsInt()
  @Min(1)
  @Max(168)
  expiresInHours!: number;
}
```

- [ ] **Step 4: Implement membership service**

Create `apps/api/src/memberships/membership.service.ts`:

```ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMembership(userId: string, groupId: string) {
    const membership = await this.prisma.membership.findUnique({ where: { groupId_userId: { groupId, userId } } });
    if (!membership) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Group not found' });
    return membership;
  }

  async requireRole(userId: string, groupId: string, roles: MembershipRole[]) {
    const membership = await this.requireMembership(userId, groupId);
    if (!roles.includes(membership.role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient group role' });
    }
    return membership;
  }
}
```

- [ ] **Step 5: Implement groups and invites**

Create `GroupsService.createGroup(userId, dto)` so it uses a transaction:

```ts
const group = await tx.group.create({ data: { name: dto.name, currency: dto.currency, createdById: userId } });
await tx.membership.create({ data: { groupId: group.id, userId, role: 'owner' } });
return group;
```

Create invite token logic in `InvitesService`:

```ts
const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
const tokenHash = await Bun.password.hash(token);
```

For accept, load active invites by status and expiry, then verify token by checking `Bun.password.verify(token, invite.tokenHash)`. On success, create membership with `role: 'member'` and set invite `status: 'accepted'`.

- [ ] **Step 6: Wire modules and controllers**

Add `GroupsModule` with providers `GroupsService`, `MembershipService`, `InvitesService`. Add controllers `GroupsController`, `InvitesController`. Import `GroupsModule` into `AppModule`.

- [ ] **Step 7: Run group and invite tests**

Run: `bun test apps/api/test/groups-invites.test.ts`

Expected: PASS, 2 tests.

- [ ] **Step 8: Run auth regression tests**

Run: `bun test apps/api/test/auth.test.ts`

Expected: PASS, 3 tests.

- [ ] **Step 9: Commit**

```bash
git add apps/api
git commit -m "feat(api): add groups and invite links"
```

---

### Task 6: Envelope Ledger, Funding, and Transfers

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/envelopes/envelopes.module.ts`
- Create: `apps/api/src/envelopes/envelopes.controller.ts`
- Create: `apps/api/src/envelopes/envelopes.service.ts`
- Create: `apps/api/src/envelopes/envelope-balance.service.ts`
- Create: `apps/api/src/envelopes/dto.ts`
- Test: `apps/api/test/envelopes.test.ts`

**Interfaces:**
- Consumes: `MembershipService.requireMembership`, `MembershipService.requireRole`.
- Produces: `GET /groups/:groupId/envelopes`, `POST /groups/:groupId/envelopes`, `POST /groups/:groupId/envelopes/:envelopeId/funding`, `POST /groups/:groupId/transfers`.
- Produces: `EnvelopeSummary = { id: string; name: string; balanceMinor: number; archivedAt: string | null }`.
- Produces: `EnvelopeBalanceService.getGroupEnvelopeSummaries(groupId)`.

- [ ] **Step 1: Write failing envelope tests**

Create `apps/api/test/envelopes.test.ts` with these assertions:

```ts
expect(createdEnvelope.body.name).toBe('Groceries');
expect(funded.body.summary.balanceMinor).toBe(50000);
expect(transfer.body.from.balanceMinor).toBe(35000);
expect(transfer.body.to.balanceMinor).toBe(15000);
```

Use the auth and group setup from `groups-invites.test.ts`: sign up owner, create group, create two envelopes, fund one envelope, then transfer from the funded envelope to the second envelope.

- [ ] **Step 2: Run tests to verify envelope routes fail**

Run: `bun test apps/api/test/envelopes.test.ts`

Expected: FAIL with 404 for `/groups/:groupId/envelopes`.

- [ ] **Step 3: Implement envelope DTOs**

Create `apps/api/src/envelopes/dto.ts`:

```ts
import { IsInt, IsString, Length, Min } from 'class-validator';

export class CreateEnvelopeDto {
  @IsString()
  @Length(1, 80)
  name!: string;
}

export class FundEnvelopeDto {
  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  @Length(0, 240)
  note = '';
}

export class TransferEnvelopeDto {
  @IsString()
  fromEnvelopeId!: string;

  @IsString()
  toEnvelopeId!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  @Length(0, 240)
  note = '';
}
```

- [ ] **Step 4: Implement balance service**

Create `apps/api/src/envelopes/envelope-balance.service.ts`:

```ts
export interface EnvelopeSummary {
  id: string;
  name: string;
  balanceMinor: number;
  archivedAt: string | null;
}

@Injectable()
export class EnvelopeBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getGroupEnvelopeSummaries(groupId: string): Promise<EnvelopeSummary[]> {
    const envelopes = await this.prisma.envelope.findMany({ where: { groupId }, orderBy: { createdAt: 'asc' } });
    const summaries = await Promise.all(envelopes.map((envelope) => this.getEnvelopeSummary(envelope.id)));
    return summaries;
  }

  async getEnvelopeSummary(envelopeId: string): Promise<EnvelopeSummary> {
    const envelope = await this.prisma.envelope.findUniqueOrThrow({ where: { id: envelopeId } });
    const [funding, incoming, outgoing, expenses] = await Promise.all([
      this.prisma.envelopeFunding.aggregate({ where: { envelopeId, deletedAt: null }, _sum: { amountMinor: true } }),
      this.prisma.envelopeTransfer.aggregate({ where: { toEnvelopeId: envelopeId, deletedAt: null }, _sum: { amountMinor: true } }),
      this.prisma.envelopeTransfer.aggregate({ where: { fromEnvelopeId: envelopeId, deletedAt: null }, _sum: { amountMinor: true } }),
      this.prisma.expense.aggregate({ where: { envelopeId, deletedAt: null }, _sum: { amountMinor: true } }),
    ]);

    return {
      id: envelope.id,
      name: envelope.name,
      archivedAt: envelope.archivedAt?.toISOString() ?? null,
      balanceMinor:
        (funding._sum.amountMinor ?? 0) +
        (incoming._sum.amountMinor ?? 0) -
        (outgoing._sum.amountMinor ?? 0) -
        (expenses._sum.amountMinor ?? 0),
    };
  }
}
```

- [ ] **Step 5: Implement envelope service and controller**

Required service methods:

```ts
createEnvelope(userId: string, groupId: string, dto: CreateEnvelopeDto): Promise<EnvelopeSummary>;
listEnvelopes(userId: string, groupId: string): Promise<EnvelopeSummary[]>;
fundEnvelope(userId: string, groupId: string, envelopeId: string, dto: FundEnvelopeDto): Promise<{ summary: EnvelopeSummary }>;
transfer(userId: string, groupId: string, dto: TransferEnvelopeDto): Promise<{ from: EnvelopeSummary; to: EnvelopeSummary }>;
```

Rules:

- `createEnvelope` requires owner or admin.
- `fundEnvelope` requires owner or admin until group settings for member funding are implemented.
- `transfer` requires owner or admin.
- `transfer` allows from-envelope to become negative only if future settings allow it; for MVP, reject transfers that exceed source balance with `INVALID_INPUT`.
- Expense overspending remains allowed in Task 7.

- [ ] **Step 6: Run envelope tests**

Run: `bun test apps/api/test/envelopes.test.ts`

Expected: PASS.

- [ ] **Step 7: Run group and auth regression tests**

Run: `bun test apps/api/test/groups-invites.test.ts apps/api/test/auth.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(api): add envelope ledger"
```

---

### Task 7: Expenses and Recurring Expenses

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/expenses/expenses.module.ts`
- Create: `apps/api/src/expenses/expenses.controller.ts`
- Create: `apps/api/src/expenses/expenses.service.ts`
- Create: `apps/api/src/expenses/dto.ts`
- Create: `apps/api/src/recurring-expenses/recurring-expenses.module.ts`
- Create: `apps/api/src/recurring-expenses/recurring-expenses.controller.ts`
- Create: `apps/api/src/recurring-expenses/recurring-expenses.service.ts`
- Create: `apps/api/src/recurring-expenses/dto.ts`
- Test: `apps/api/test/expenses-recurring.test.ts`

**Interfaces:**
- Consumes: `EnvelopeBalanceService` and `MembershipService`.
- Produces: `POST /groups/:groupId/expenses`, `GET /groups/:groupId/expenses`, `DELETE /groups/:groupId/expenses/:expenseId`.
- Produces: `POST /groups/:groupId/recurring-expenses`, `GET /groups/:groupId/recurring-expenses/upcoming`, `POST /groups/:groupId/recurring-expenses/:id/confirm`.

- [ ] **Step 1: Write failing expense and recurring tests**

Create `apps/api/test/expenses-recurring.test.ts` to verify:

```ts
expect(addExpense.body.summary.balanceMinor).toBe(-2500);
expect(addExpense.body.expense.title).toBe('Vegetables');
expect(upcoming.body[0].title).toBe('Rent');
expect(confirm.body.expense.title).toBe('Rent');
```

Setup: owner signs up, creates group, creates envelope with no funding, adds an expense. This verifies overspending is allowed. Then create monthly recurring expense and confirm it into an expense.

- [ ] **Step 2: Run tests to verify routes fail**

Run: `bun test apps/api/test/expenses-recurring.test.ts`

Expected: FAIL with 404 for expense routes.

- [ ] **Step 3: Implement DTOs**

Create `apps/api/src/expenses/dto.ts`:

```ts
import { IsDateString, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  envelopeId!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsDateString()
  spentAt!: string;

  @IsString()
  @Length(1, 120)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 240)
  note?: string;
}
```

Create `apps/api/src/recurring-expenses/dto.ts`:

```ts
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateRecurringExpenseDto {
  @IsString()
  envelopeId!: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  @Length(1, 120)
  title!: string;

  @IsIn(['weekly', 'monthly', 'yearly'])
  frequency!: 'weekly' | 'monthly' | 'yearly';

  @IsDateString()
  nextDueAt!: string;

  @IsOptional()
  @IsString()
  @Length(0, 240)
  note?: string;
}
```

- [ ] **Step 4: Implement expense service**

Required methods:

```ts
createExpense(userId: string, groupId: string, dto: CreateExpenseDto): Promise<{ expense: ExpenseDto; summary: EnvelopeSummary }>;
listExpenses(userId: string, groupId: string): Promise<ExpenseDto[]>;
deleteExpense(userId: string, groupId: string, expenseId: string): Promise<{ deleted: true; summary: EnvelopeSummary }>;
```

Rules:

- Any member can add expenses to their group.
- Members can delete only their own expenses.
- Owner/admin can delete any group expense.
- Delete means set `deletedAt`, not hard delete.
- Creating an expense can make an envelope balance negative.

- [ ] **Step 5: Implement recurring expense service**

Required methods:

```ts
createRecurring(userId: string, groupId: string, dto: CreateRecurringExpenseDto): Promise<RecurringExpenseDto>;
listUpcoming(userId: string, groupId: string): Promise<RecurringExpenseDto[]>;
confirmOccurrence(userId: string, groupId: string, recurringExpenseId: string): Promise<{ expense: ExpenseDto; nextDueAt: string }>;
```

Next due rules:

```ts
function advanceDueDate(current: Date, frequency: 'weekly' | 'monthly' | 'yearly'): Date {
  const next = new Date(current);
  if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  if (frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);
  return next;
}
```

- [ ] **Step 6: Run expense and recurring tests**

Run: `bun test apps/api/test/expenses-recurring.test.ts`

Expected: PASS.

- [ ] **Step 7: Run envelope regression tests**

Run: `bun test apps/api/test/envelopes.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(api): add expenses and recurring expenses"
```

---

### Task 8: Reports and Dashboard Summary API

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/reports/reports.module.ts`
- Create: `apps/api/src/reports/reports.controller.ts`
- Create: `apps/api/src/reports/reports.service.ts`
- Test: `apps/api/test/reports.test.ts`

**Interfaces:**
- Consumes: `EnvelopeBalanceService`, `MembershipService`, Prisma `Expense`, `RecurringExpense`.
- Produces: `GET /groups/:groupId/dashboard`.
- Produces: `DashboardSummary = { totalAvailableMinor: number; spentThisMonthMinor: number; envelopes: EnvelopeSummary[]; overspent: EnvelopeSummary[]; upcomingRecurring: RecurringExpenseDto[]; recentActivity: ActivityItem[]; generatedAt: string }`.

- [ ] **Step 1: Write failing dashboard summary test**

Create `apps/api/test/reports.test.ts` asserting:

```ts
expect(response.body.totalAvailableMinor).toBe(7500);
expect(response.body.spentThisMonthMinor).toBe(2500);
expect(response.body.envelopes).toHaveLength(1);
expect(response.body.generatedAt).toBeString();
```

Setup: create group, envelope, fund 10000, add expense 2500.

- [ ] **Step 2: Run test to verify route fails**

Run: `bun test apps/api/test/reports.test.ts`

Expected: FAIL with 404 for `/groups/:groupId/dashboard`.

- [ ] **Step 3: Implement report service**

Create `ReportsService.getDashboard(userId, groupId)`:

```ts
const envelopes = await this.balanceService.getGroupEnvelopeSummaries(groupId);
const totalAvailableMinor = envelopes.reduce((sum, envelope) => sum + envelope.balanceMinor, 0);
const overspent = envelopes.filter((envelope) => envelope.balanceMinor < 0);
```

Calculate `spentThisMonthMinor` using the first day of the current month through now:

```ts
const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
const spent = await this.prisma.expense.aggregate({
  where: { groupId, deletedAt: null, spentAt: { gte: startOfMonth, lte: now } },
  _sum: { amountMinor: true },
});
```

Recent activity contains latest 10 funding, transfers, and expenses normalized to:

```ts
interface ActivityItem {
  id: string;
  type: 'funding' | 'transfer' | 'expense';
  title: string;
  amountMinor: number;
  occurredAt: string;
}
```

- [ ] **Step 4: Wire report controller**

Controller route:

```ts
@Get('groups/:groupId/dashboard')
@UseGuards(JwtAuthGuard)
getDashboard(@CurrentUserParam() user: CurrentUser, @Param('groupId') groupId: string) {
  return this.reportsService.getDashboard(user.id, groupId);
}
```

- [ ] **Step 5: Run report test**

Run: `bun test apps/api/test/reports.test.ts`

Expected: PASS.

- [ ] **Step 6: Run all API tests added so far**

Run: `bun test apps/api/test/health.test.ts apps/api/test/auth.test.ts apps/api/test/groups-invites.test.ts apps/api/test/envelopes.test.ts apps/api/test/expenses-recurring.test.ts apps/api/test/reports.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): add dashboard reports"
```

---

### Task 9: Next.js, Mantine, and PWA Shell

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/providers.tsx`
- Create: `apps/web/src/styles/theme.ts`
- Create: `apps/web/public/manifest.webmanifest`
- Create: `apps/web/public/icons/icon-192.svg`
- Create: `apps/web/public/icons/icon-512.svg`
- Test: `apps/web/test/pwa-shell.test.ts`

**Interfaces:**
- Consumes: Mantine provider setup.
- Produces: installable PWA shell with root page heading `Wallet`.
- Produces: metadata links to `manifest.webmanifest`.

- [ ] **Step 1: Write failing PWA shell test**

Create `apps/web/test/pwa-shell.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('PWA shell', () => {
  test('declares manifest and Wallet app name', () => {
    const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
    expect(manifest.name).toBe('Wallet');
    expect(manifest.display).toBe('standalone');
  });

  test('uses Mantine provider in app layout', () => {
    const layout = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
    expect(layout).toContain('MantineProvider');
    expect(layout).toContain('ColorSchemeScript');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/test/pwa-shell.test.ts`

Expected: FAIL with missing manifest/layout files.

- [ ] **Step 3: Create web package**

Create `apps/web/package.json`:

```json
{
  "name": "@wallet/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --bun next dev",
    "build": "bun --bun next build",
    "start": "bun --bun next start",
    "test": "bun test test/*.test.ts",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "@mantine/core": "latest",
    "@mantine/dates": "latest",
    "@mantine/form": "latest",
    "@mantine/hooks": "latest",
    "@mantine/notifications": "latest",
    "@wallet/shared": "workspace:*",
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "workbox-window": "latest"
  },
  "devDependencies": {
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "typescript": "latest"
  }
}
```

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "allowJs": false,
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", "test/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `apps/web/next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

- [ ] **Step 4: Implement Mantine layout and homepage**

Create `apps/web/src/styles/theme.ts`:

```ts
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'teal',
  fontFamily: 'Inter, system-ui, sans-serif',
});
```

Create `apps/web/src/app/providers.tsx`:

```tsx
'use client';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '../styles/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme}>
      <Notifications />
      {children}
    </MantineProvider>
  );
}
```

Create `apps/web/src/app/layout.tsx`:

```tsx
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Wallet',
  description: 'Family envelope budgeting',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0CA678',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

Create `apps/web/src/app/page.tsx`:

```tsx
import { Button, Container, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title>Wallet</Title>
        <Text c="dimmed">Family envelope budgeting for shared spending.</Text>
        <Button component={Link} href="/login">Get started</Button>
      </Stack>
    </Container>
  );
}
```

- [ ] **Step 5: Add manifest and temporary SVG icons**

Create `apps/web/public/manifest.webmanifest`:

```json
{
  "name": "Wallet",
  "short_name": "Wallet",
  "description": "Family envelope budgeting for shared spending.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#0CA678",
  "icons": [
    { "src": "/icons/icon-192.svg", "sizes": "192x192", "type": "image/svg+xml" },
    { "src": "/icons/icon-512.svg", "sizes": "512x512", "type": "image/svg+xml" }
  ]
}
```

Use the same SVG content for `icon-192.svg` and `icon-512.svg` with different `width`/`height`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="42" fill="#0CA678"/>
  <path d="M48 68h96a12 12 0 0 1 12 12v48a12 12 0 0 1-12 12H48a12 12 0 0 1-12-12V80a12 12 0 0 1 12-12Z" fill="#fff"/>
  <circle cx="128" cy="104" r="10" fill="#0CA678"/>
</svg>
```

- [ ] **Step 6: Run web shell test**

Run: `bun install`

Expected: exits 0.

Run: `bun test apps/web/test/pwa-shell.test.ts`

Expected: PASS, 2 tests.

- [ ] **Step 7: Build web app**

Run: `bun run --filter @wallet/web build`

Expected: Next.js build exits 0.

- [ ] **Step 8: Commit**

```bash
git add package.json bun.lock apps/web
git commit -m "feat(web): add Next Mantine PWA shell"
```

---

### Task 10: Web API Client, Auth, Group, and Invite Flows

**Files:**
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/lib/auth-store.tsx`
- Create: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/app/signup/page.tsx`
- Create: `apps/web/src/app/groups/new/page.tsx`
- Create: `apps/web/src/app/invites/[token]/page.tsx`
- Test: `apps/web/test/api-client.test.ts`

**Interfaces:**
- Consumes: API endpoints from Tasks 4 and 5.
- Produces: `apiClient.request<T>(path, options)`.
- Produces: auth token held in memory and refreshed through cookie-backed `/auth/refresh`.

- [ ] **Step 1: Write failing API client test**

Create `apps/web/test/api-client.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { createApiClient } from '../src/lib/api-client';

describe('api client', () => {
  test('prefixes configured API base URL and attaches bearer token', async () => {
    const calls: { url: string; headers: HeadersInit | undefined }[] = [];
    const client = createApiClient({
      baseUrl: 'http://api.test',
      getAccessToken: () => 'abc123',
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), headers: init?.headers });
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });

    await client.request('/health');
    expect(calls[0].url).toBe('http://api.test/health');
    expect(new Headers(calls[0].headers).get('Authorization')).toBe('Bearer abc123');
  });
});
```

- [ ] **Step 2: Run API client test to verify it fails**

Run: `bun test apps/web/test/api-client.test.ts`

Expected: FAIL with missing `api-client`.

- [ ] **Step 3: Implement API client**

Create `apps/web/src/lib/api-client.ts`:

```ts
import type { ApiErrorBody } from '@wallet/shared';

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken: () => string | null;
  fetchImpl?: typeof fetch;
}

export function createApiClient(options: ApiClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');
    const token = options.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetchImpl(`${options.baseUrl}${path}`, { ...init, headers, credentials: 'include' });
    const body = await response.json().catch(() => undefined);
    if (!response.ok) {
      const error = body as ApiErrorBody | undefined;
      throw new Error(error?.message ?? 'Request failed');
    }
    return body as T;
  }

  return { request };
}

export const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000',
  getAccessToken: () => (typeof window === 'undefined' ? null : window.sessionStorage.getItem('wallet_access_token')),
});
```

- [ ] **Step 4: Implement auth store**

Create `apps/web/src/lib/auth-store.tsx`:

```tsx
'use client';

import { createContext, useContext, useMemo, useState } from 'react';

interface AuthState {
  accessToken: string | null;
  setAccessToken(token: string | null): void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const value = useMemo<AuthState>(() => ({
    accessToken,
    setAccessToken(token) {
      setAccessTokenState(token);
      if (token) window.sessionStorage.setItem('wallet_access_token', token);
      else window.sessionStorage.removeItem('wallet_access_token');
    },
  }), [accessToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
```

Wrap `AuthProvider` inside `Providers` in `apps/web/src/app/providers.tsx`.

- [ ] **Step 5: Create auth and group pages**

Create login/signup forms with Mantine `TextInput`, `PasswordInput`, `Button`, and `useForm`. Required form submission calls:

```ts
await apiClient.request<{ accessToken: string; user: { id: string; email: string; displayName: string } }>('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: values.email, password: values.password }),
});
```

Create group form submission:

```ts
await apiClient.request<{ id: string; name: string; currency: string }>('/groups', {
  method: 'POST',
  body: JSON.stringify({ name: values.name, currency: values.currency }),
});
```

Create invite acceptance page using route param token:

```ts
await apiClient.request<{ groupId: string }>(`/invites/${token}/accept`, { method: 'POST' });
```

- [ ] **Step 6: Run API client test and web typecheck**

Run: `bun test apps/web/test/api-client.test.ts`

Expected: PASS.

Run: `bun run --filter @wallet/web typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): add auth and invite flows"
```

---

### Task 11: Envelope-First Dashboard UI and Forms

**Files:**
- Create: `apps/web/src/features/dashboard/types.ts`
- Create: `apps/web/src/features/dashboard/dashboard-page.tsx`
- Create: `apps/web/src/features/envelopes/envelope-card.tsx`
- Create: `apps/web/src/features/envelopes/envelope-forms.tsx`
- Create: `apps/web/src/app/groups/[groupId]/page.tsx`
- Create: `apps/web/src/app/groups/[groupId]/envelopes/page.tsx`
- Create: `apps/web/src/app/groups/[groupId]/activity/page.tsx`
- Create: `apps/web/src/app/groups/[groupId]/reports/page.tsx`
- Create: `apps/web/src/app/groups/[groupId]/settings/page.tsx`
- Test: `apps/web/test/dashboard-contract.test.ts`

**Interfaces:**
- Consumes: `GET /groups/:groupId/dashboard`, envelope, funding, transfer, expense, recurring APIs.
- Produces: envelope-first dashboard with total available, spent this month, envelope cards, upcoming recurring, and recent activity.

- [ ] **Step 1: Write failing dashboard contract test**

Create `apps/web/test/dashboard-contract.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('dashboard UI contract', () => {
  test('dashboard page is envelope-first', () => {
    const source = readFileSync(new URL('../src/features/dashboard/dashboard-page.tsx', import.meta.url), 'utf8');
    expect(source).toContain('Total available');
    expect(source).toContain('Spent this month');
    expect(source).toContain('Add expense');
    expect(source).toContain('Fund envelope');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/test/dashboard-contract.test.ts`

Expected: FAIL with missing dashboard file.

- [ ] **Step 3: Define dashboard types**

Create `apps/web/src/features/dashboard/types.ts`:

```ts
export interface EnvelopeSummary {
  id: string;
  name: string;
  balanceMinor: number;
  archivedAt: string | null;
}

export interface ActivityItem {
  id: string;
  type: 'funding' | 'transfer' | 'expense';
  title: string;
  amountMinor: number;
  occurredAt: string;
}

export interface DashboardSummary {
  totalAvailableMinor: number;
  spentThisMonthMinor: number;
  envelopes: EnvelopeSummary[];
  overspent: EnvelopeSummary[];
  upcomingRecurring: Array<{ id: string; title: string; amountMinor: number; nextDueAt: string }>;
  recentActivity: ActivityItem[];
  generatedAt: string;
}
```

- [ ] **Step 4: Implement envelope card and forms**

Create `EnvelopeCard` props:

```ts
interface EnvelopeCardProps {
  envelope: EnvelopeSummary;
  currency: string;
}
```

Render negative balances in red and non-negative balances in teal.

Create `EnvelopeForms` with four submit handlers:

```ts
onAddExpense(values: { envelopeId: string; amountMinor: number; spentAt: string; title: string; note?: string }): Promise<void>;
onFundEnvelope(values: { envelopeId: string; amountMinor: number; note?: string }): Promise<void>;
onTransfer(values: { fromEnvelopeId: string; toEnvelopeId: string; amountMinor: number; note?: string }): Promise<void>;
onCreateRecurring(values: { envelopeId: string; amountMinor: number; title: string; frequency: 'weekly' | 'monthly' | 'yearly'; nextDueAt: string; note?: string }): Promise<void>;
```

- [ ] **Step 5: Implement dashboard page**

Create `DashboardPage` props:

```ts
interface DashboardPageProps {
  groupId: string;
  currency: string;
}
```

Fetch dashboard on mount:

```ts
const dashboard = await apiClient.request<DashboardSummary>(`/groups/${groupId}/dashboard`);
```

After each mutation, refetch dashboard once and replace the displayed summary.

Dashboard layout order:

1. Header with group name area and invite action.
2. Summary cards: `Total available`, `Spent this month`.
3. Primary action buttons: `Add expense`, `Fund envelope`, `Transfer`.
4. Envelope cards grid.
5. Overspent/low balance attention area.
6. Upcoming recurring expenses.
7. Recent activity.

- [ ] **Step 6: Wire group routes**

Create `apps/web/src/app/groups/[groupId]/page.tsx`:

```tsx
import { DashboardPage } from '../../../features/dashboard/dashboard-page';

export default function GroupHome({ params }: { params: { groupId: string } }) {
  return <DashboardPage groupId={params.groupId} currency="INR" />;
}
```

Create route pages for Envelopes, Activity, Reports, and Settings that call the same API client and show readable empty states. These are product screens, not dead ends: each page must explain what appears there when data exists.

- [ ] **Step 7: Run dashboard contract and typecheck**

Run: `bun test apps/web/test/dashboard-contract.test.ts`

Expected: PASS.

Run: `bun run --filter @wallet/web typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(web): add envelope dashboard"
```

---

### Task 12: Offline Read-Only PWA Caching

**Files:**
- Modify: `apps/web/src/app/providers.tsx`
- Create: `apps/web/src/lib/register-service-worker.ts`
- Create: `apps/web/src/components/stale-data-banner.tsx`
- Create: `apps/web/public/sw.js`
- Test: `apps/web/test/offline-cache.test.ts`

**Interfaces:**
- Consumes: dashboard, envelope, activity API responses.
- Produces: offline read-only cache for GET requests only.
- Produces: visible stale banner when `navigator.onLine === false` or cached data is older than last network refresh.

- [ ] **Step 1: Write failing service worker contract test**

Create `apps/web/test/offline-cache.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('offline cache service worker', () => {
  test('caches only GET dashboard and envelope reads', () => {
    const worker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
    expect(worker).toContain('StaleWhileRevalidate');
    expect(worker).toContain('/dashboard');
    expect(worker).toContain('request.method === "GET"');
    expect(worker).not.toContain('POST');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/test/offline-cache.test.ts`

Expected: FAIL with missing `sw.js`.

- [ ] **Step 3: Implement service worker registration**

Create `apps/web/src/lib/register-service-worker.ts`:

```ts
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
```

Call `registerServiceWorker()` from a client component inside `Providers` using `useEffect`.

- [ ] **Step 4: Implement stale data banner**

Create `apps/web/src/components/stale-data-banner.tsx`:

```tsx
'use client';

import { Alert } from '@mantine/core';
import { useEffect, useState } from 'react';

export function StaleDataBanner({ generatedAt }: { generatedAt?: string }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (online) return null;

  return (
    <Alert color="yellow" title="Offline read-only mode">
      Showing cached Wallet data{generatedAt ? ` from ${new Date(generatedAt).toLocaleString()}` : ''}. New expenses require a connection.
    </Alert>
  );
}
```

Render `StaleDataBanner` at the top of `DashboardPage`.

- [ ] **Step 5: Implement Workbox service worker**

Create `apps/web/public/sw.js`:

```js
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

workbox.routing.registerRoute(
  ({ request, url }) =>
    request.method === "GET" &&
    url.origin === self.location.origin &&
    (url.pathname.includes('/dashboard') || url.pathname.includes('/envelopes') || url.pathname.includes('/activity')),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'wallet-readonly-api-v1',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  })
);
```

- [ ] **Step 6: Run offline cache test and build**

Run: `bun test apps/web/test/offline-cache.test.ts`

Expected: PASS.

Run: `bun run --filter @wallet/web build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): add offline read-only caching"
```

---

### Task 13: Coolify Deployment and Smoke Tests

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `apps/web/Dockerfile`
- Create: `apps/smoke/package.json`
- Create: `apps/smoke/coolify-smoke.test.ts`
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `/health`, frontend root route, `DATABASE_URL`, `NEXT_PUBLIC_API_BASE_URL`.
- Produces: Coolify-ready Docker builds using Bun.
- Produces: smoke test command `bun run --filter @wallet/smoke test`.

- [ ] **Step 1: Write failing smoke test**

Create `apps/smoke/package.json`:

```json
{
  "name": "@wallet/smoke",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "bun test coolify-smoke.test.ts",
    "build": "bun test coolify-smoke.test.ts",
    "typecheck": "tsc --noEmit --allowJs false --moduleResolution Bundler --module ESNext --target ES2022 coolify-smoke.test.ts"
  },
  "devDependencies": {
    "typescript": "latest"
  }
}
```

Create `apps/smoke/coolify-smoke.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';

const apiUrl = process.env.API_PUBLIC_URL ?? 'http://localhost:4000';
const webUrl = process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';

describe('Coolify smoke', () => {
  test('API health endpoint is reachable', async () => {
    const response = await fetch(`${apiUrl}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', service: 'wallet-api' });
  });

  test('frontend root is reachable', async () => {
    const response = await fetch(webUrl);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Wallet');
  });
});
```

- [ ] **Step 2: Run smoke test to verify it fails against absent services**

Run: `bun run --filter @wallet/smoke test`

Expected: FAIL with connection refused if local services are not running.

- [ ] **Step 3: Add API Dockerfile**

Create `apps/api/Dockerfile`:

```dockerfile
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api/package.json ./apps/api/package.json
RUN bun install --frozen-lockfile

FROM deps AS build
COPY apps/api ./apps/api
RUN bun --cwd apps/api prisma generate
RUN bun run --filter @wallet/api build

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/bun.lock /app/tsconfig.base.json ./
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api ./apps/api
RUN bun install --frozen-lockfile --production
EXPOSE 4000
CMD ["bun", "--cwd", "apps/api", "src/main.ts"]
```

- [ ] **Step 4: Add web Dockerfile**

Create `apps/web/Dockerfile`:

```dockerfile
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web/package.json ./apps/web/package.json
RUN bun install --frozen-lockfile

FROM deps AS build
COPY apps/web ./apps/web
RUN bun run --filter @wallet/web build

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/bun.lock /app/tsconfig.base.json ./
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/web ./apps/web
RUN bun install --frozen-lockfile --production
EXPOSE 3000
CMD ["bun", "--cwd", "apps/web", "--bun", "next", "start"]
```

- [ ] **Step 5: Add migration deployment command**

Modify root `package.json` scripts:

```json
{
  "scripts": {
    "db:deploy": "bun --cwd apps/api prisma migrate deploy",
    "coolify:api:start": "bun run db:deploy && bun --cwd apps/api src/main.ts",
    "coolify:web:start": "bun --cwd apps/web --bun next start"
  }
}
```

Coolify API service start command: `bun run coolify:api:start`.

Coolify web service start command: `bun run coolify:web:start`.

- [ ] **Step 6: Build both Docker images locally**

Run: `docker build -f apps/api/Dockerfile -t wallet-api:local .`

Expected: image builds successfully.

Run: `docker build -f apps/web/Dockerfile -t wallet-web:local .`

Expected: image builds successfully.

- [ ] **Step 7: Run full verification commands**

Run: `bun test packages/shared/src/money.test.ts apps/api/test/*.test.ts apps/web/test/*.test.ts`

Expected: PASS.

Run: `bun run typecheck`

Expected: PASS.

Run: `bun run build`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json bun.lock .env.example apps/api/Dockerfile apps/web/Dockerfile apps/smoke
git commit -m "chore: add Coolify deployment"
```

---

## Self-Review Checklist

- Spec coverage: Tasks 1-3 cover Bun workspace, PostgreSQL, Prisma migrations, and API foundation. Tasks 4-8 cover auth, groups, invite links, roles, persistent envelopes, funding, transfers, expenses, recurring expenses, reports, and group isolation. Tasks 9-12 cover Next.js, Mantine, PWA installability, envelope-first UX, and offline read-only caching. Task 13 covers Coolify, Docker, migrations, health, and smoke tests.
- Red-flag scan: This plan uses exact paths, exact interfaces, concrete DTO fields, concrete commands, and expected command outcomes.
- Type consistency: Money is consistently `amountMinor: number`. Roles are consistently `owner | admin | member`. Envelope summaries consistently use `balanceMinor`. Dashboard summaries consistently use `totalAvailableMinor`, `spentThisMonthMinor`, and `generatedAt`.
- Known implementation risk: Prisma generated client import paths can vary by Prisma major version. If `../generated/prisma/client` fails after `prisma generate`, use the generated file path printed by Prisma and update all imports in the same task before committing.
