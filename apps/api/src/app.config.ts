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

export function configureApp(app: INestApplication): INestApplication {
  app.use(cookieParser());
  app.enableCors({ origin: env.WEB_PUBLIC_URL, credentials: true });
  app.useGlobalPipes(createValidationPipe());
  return app;
}
