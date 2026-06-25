import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { configureApp } from './app.config';
import { env } from './config/env';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = configureApp(await NestFactory.create(AppModule));
  await app.listen(env.API_PORT);
}

void bootstrap();
