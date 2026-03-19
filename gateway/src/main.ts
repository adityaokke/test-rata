import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const logger = new Logger('Gateway')
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  })

  // Health check
  app.getHttpAdapter().get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'gateway' })
  })

  const port = process.env.PORT ?? 3000
  await app.listen(port)
  logger.log(`Gateway running on port ${port}`)
  logger.log(`GraphQL playground: http://localhost:${port}/graphql`)
  logger.log(`Subgraphs: auth-service → chat-service`)
}
bootstrap()
