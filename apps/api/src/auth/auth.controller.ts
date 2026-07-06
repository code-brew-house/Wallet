import { Body, Controller, Get, HttpCode, Inject, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createValidationPipe } from '../app.config';
import { env } from '../config/env';
import { CurrentUserParam } from './current-user';
import type { CurrentUser } from './current-user';
import { LoginDto, SignupDto, UpdatePasswordDto } from './dto';
import { AuthService } from './auth.service';
import type { AuthResponse } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

const refreshCookieName = 'wallet_refresh';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body(createValidationPipe(SignupDto)) dto: SignupDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const authResponse = await this.authService.signup(dto);
    await this.setRefreshCookie(response, authResponse.user);
    return authResponse;
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(createValidationPipe(LoginDto)) dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const authResponse = await this.authService.login(dto);
    await this.setRefreshCookie(response, authResponse.user);
    return authResponse;
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<AuthResponse> {
    const refreshToken = this.readRefreshToken(request);
    if (!refreshToken) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const authResponse = await this.authService.refresh(refreshToken);
    await this.setRefreshCookie(response, authResponse.user);
    return authResponse;
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response): { ok: true } {
    response.clearCookie(refreshCookieName, this.refreshCookieOptions());
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUserParam() user: CurrentUser): Promise<CurrentUser> {
    return user;
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  async updatePassword(
    @CurrentUserParam() user: CurrentUser,
    @Body(createValidationPipe(UpdatePasswordDto)) dto: UpdatePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const authResponse = await this.authService.updatePassword(user.id, dto);
    await this.setRefreshCookie(response, authResponse.user);
    return authResponse;
  }

  private async setRefreshCookie(response: Response, user: CurrentUser): Promise<void> {
    response.cookie(refreshCookieName, await this.authService.createRefreshToken(user), this.refreshCookieOptions());
  }

  private refreshCookieOptions() {
    return {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/auth/refresh',
      domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
    };
  }

  private readRefreshToken(request: Request): string | undefined {
    const parsedCookie = request.cookies?.[refreshCookieName];
    return typeof parsedCookie === 'string' ? parsedCookie : undefined;
  }
}
