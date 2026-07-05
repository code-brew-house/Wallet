import { BadRequestException } from '@nestjs/common';
import { describe, expect, test } from 'bun:test';
import { AuthService } from '../src/auth/auth.service';

describe('AuthService', () => {
  test('signup maps nested Prisma unique-constraint errors to INVALID_INPUT', async () => {
    const prisma = {
      user: {
        create: async () => {
          throw { cause: { originalCode: '23505' } };
        },
      },
    };
    const jwtService = { signAsync: async () => 'access-token' };
    const service = new AuthService(prisma as never, jwtService as never);

    try {
      await service.signup({ email: 'duplicate@example.com', password: 'StrongPass123!', displayName: 'Duplicate' });
      throw new Error('signup unexpectedly succeeded');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        code: 'INVALID_INPUT',
        message: 'Unable to create account with those details',
      });
    }
  });
});
