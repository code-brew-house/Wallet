import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { ApiErrorBody } from '@wallet/shared';
import { env } from './config/env';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: env.WEB_PUBLIC_URL, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
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
    }),
  );
  await app.listen(env.API_PORT);
}

void bootstrap();
