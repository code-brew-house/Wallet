import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ApiErrorBody } from '@wallet/shared';
import * as argon2 from 'argon2';
import { env } from '../config/env';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUser } from './current-user';
import type { LoginDto, SignupDto } from './dto';

export interface AuthResponse {
  user: { id: string; email: string; displayName: string };
  accessToken: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  displayName: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponse> {
    const passwordHash = await argon2.hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: { email: dto.email, passwordHash, displayName: dto.displayName },
      });

      return this.createAuthResponse(user);
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        throw new BadRequestException({
          code: 'INVALID_INPUT',
          message: 'Unable to create account with those details',
        } satisfies ApiErrorBody);
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw this.loginFailed();
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw this.loginFailed();
    }

    return this.createAuthResponse(user);
  }

  async verifyAccessToken(token: string): Promise<CurrentUser> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret: env.JWT_ACCESS_SECRET });
      return { id: payload.sub, email: payload.email, displayName: payload.displayName };
    } catch {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Authentication required' } satisfies ApiErrorBody);
    }
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, { secret: env.JWT_REFRESH_SECRET });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new Error('Refresh token user not found');
      }

      return this.createAuthResponse(user);
    } catch {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Authentication required' } satisfies ApiErrorBody);
    }
  }

  async createRefreshToken(user: CurrentUser): Promise<string> {
    return this.jwtService.signAsync(this.toPayload(user), { secret: env.JWT_REFRESH_SECRET, expiresIn: '30d' });
  }

  private async createAuthResponse(user: User): Promise<AuthResponse> {
    const currentUser = this.toCurrentUser(user);
    return {
      user: currentUser,
      accessToken: await this.jwtService.signAsync(this.toPayload(currentUser), {
        secret: env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      }),
    };
  }

  private toPayload(user: CurrentUser): JwtPayload {
    return { sub: user.id, email: user.email, displayName: user.displayName };
  }

  private toCurrentUser(user: User): CurrentUser {
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  private loginFailed(): UnauthorizedException {
    return new UnauthorizedException({ code: 'LOGIN_FAILED', message: 'Invalid email or password' } satisfies ApiErrorBody);
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
