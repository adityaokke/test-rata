import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import type { Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Gateway');
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  });

  app.getHttpAdapter().get('/.well-known/health', (_req, res: Response) => {
    res.json({ status: 'ok', service: 'gateway' });
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Gateway running on port ${port}`);
  logger.log(`GraphQL playground: http://localhost:${port}/graphql`);
  logger.log(`Subgraphs: auth-service → chat-service`);
}
void bootstrap();
