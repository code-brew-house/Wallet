import {
  BadRequestException,
  ValidationPipe,
  type INestApplication,
  type Type,
  type ValidationPipeOptions,
} from '@nestjs/common';
import type { ApiErrorBody } from '@wallet/shared';
import cookieParser from 'cookie-parser';
import { env } from './config/env';

export function createValidationPipe(expectedType?: Type): ValidationPipe {
  const options: ValidationPipeOptions = {
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => {
      const details = Object.fromEntries(
        errors.map((error) => [error.property, Object.values(error.constraints ?? {})]),
      );
      const response: ApiErrorBody = {
        code: 'INVALID_INPUT',
        message: 'Invalid request body',
        details,
      };

      return new BadRequestException(response);
    },
  };

  if (expectedType) {
    options.expectedType = expectedType;
  }

  return new ValidationPipe(options);
}

export function getAllowedCorsOrigins(webPublicUrl: string, nodeEnv: string): string[] {
  const configuredOrigin = webPublicUrl.replace(/\/+$/, '');
  const origins = [configuredOrigin];
  if (nodeEnv !== 'production') {
    const webUrl = new URL(configuredOrigin);
    if (webUrl.hostname === 'localhost' || webUrl.hostname === '127.0.0.1') {
      webUrl.hostname = webUrl.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
      origins.push(webUrl.toString().replace(/\/+$/, ''));
    }
  }
  return origins;
}

export function configureApp(app: INestApplication): INestApplication {
  app.use(cookieParser());
  app.enableCors({ origin: getAllowedCorsOrigins(env.WEB_PUBLIC_URL, env.NODE_ENV), credentials: true });
  app.useGlobalPipes(createValidationPipe());
  return app;
}
