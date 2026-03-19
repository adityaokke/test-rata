# auth-service

GraphQL authentication microservice built with NestJS. Handles user registration, login, and JWT validation for other services in the platform.

## Stack

- **NestJS** — framework
- **Apollo GraphQL** — API layer (GraphiQL enabled in development)
- **Prisma** — ORM with generated client
- **PostgreSQL** — database
- **JWT** — stateless auth tokens
- **bcrypt** — password hashing

## GraphQL API

| Operation | Type | Description |
|---|---|---|
| `register(input)` | Mutation | Create account, returns JWT + user |
| `login(input)` | Mutation | Authenticate, returns JWT + user |
| `validateToken(token)` | Query | Verify a JWT — used by other services |

GraphiQL playground: `http://localhost:3001/graphql` (development only)

## Getting started

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment**

```bash
cp .env.example .env
# edit .env with your database URL and JWT secret
```

**3. Run database migrations**

```bash
npx prisma migrate deploy
```

**4. Start the service**

```bash
# development (watch mode)
npm run start:dev

# debug mode
npm run start:debug

# production
npm run start:prod
```

Service starts on `PORT` (default `3001`).

## Environment variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | HTTP port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/auth_db` |
| `JWT_SECRET` | Secret used to sign tokens | `change-me` |
| `JWT_EXPIRES_IN` | Token expiry duration | `7d` |

## Tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# coverage
npm run test:cov
```

├── prisma/
│   ├── schema.prisma               # User model with UUID PK + email index
│   └── migrations/…/migration.sql # Initial DDL
├── src/
│   ├── main.ts
│   ├── app.module.ts               # GraphQL + JWT (global) + Prisma wiring
│   ├── auth/
│   │   ├── auth.types.ts           # ObjectTypes + InputTypes (code-first schema)
│   │   ├── auth.service.ts         # Business logic: register / login / validateToken
│   │   ├── auth.resolver.ts        # GraphQL mutations + query
│   │   ├── auth.module.ts
│   │   └── __tests__/auth.service.spec.ts
│   └── common/
│       ├── prisma/                 # Global PrismaModule + PrismaService
│       ├── guards/jwt-auth.guard.ts        # Reusable JwtAuthGuard for other services
│       ├── decorators/current-user.decorator.ts
│       ├── filters/gql-exception.filter.ts # Maps HTTP exceptions → clean GQL errors
│       └── health.controller.ts    # GET /.well-known/health for Docker healthcheck
├── Dockerfile                      # Multi-stage build (builder → runner)
├── docker-compose.yml              # Auth service + postgres-auth + network
└── .env.example

1st step: https://dev.to/micalevisk/5-steps-to-create-a-bare-minimum-nestjs-app-from-scratch-5c3b
<!-- npm install reflect-metadata @nestjs/common @nestjs/core -->
prisma: https://docs.nestjs.com/recipes/prisma#set-up-prisma
config: https://docs.nestjs.com/techniques/configuration
graphql: https://docs.nestjs.com/graphql/quick-start
jwt: https://docs.nestjs.com/recipes/passport#passport-authentication
federation: 
https://docs.nestjs.com/graphql/federation#federated-example-gateway-1
https://github.com/nestjs/nest/tree/master/sample/31-graphql-federation-code-first