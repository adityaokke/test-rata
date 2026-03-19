import type { StringValue } from 'ms'
import ms from 'ms'

export default () => {
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? '7d'
  if (!ms(jwtExpiresIn as unknown as StringValue)) {
    throw new Error(`Invalid JWT_EXPIRES_IN: "${jwtExpiresIn}"`)
  }

  return {
    nodeEnv:  process.env.NODE_ENV ?? 'development',
    port:     parseInt(process.env.PORT ?? '3002', 10),
    jwt: {
      secret:    process.env.JWT_SECRET ?? '',
      expiresIn: jwtExpiresIn as StringValue,
    },
    database: {
      url: process.env.DATABASE_URL ?? '',
    },
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    },
    auth: {
      serviceUrl: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001/graphql',
    },
  }
}
