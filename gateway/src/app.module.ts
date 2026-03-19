import 'dotenv/config'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo'
import {
  IntrospectAndCompose,
  RemoteGraphQLDataSource,
  type GraphQLDataSourceProcessOptions,
} from '@apollo/gateway'
import configuration from './config/configuration'

// ── Auth forwarding datasource ─────────────────────────────────
// Passes the Authorization header from the incoming request
// down to each subgraph so JWT validation works per-service.
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest(options: GraphQLDataSourceProcessOptions) {
    const context = options.context as { req?: { headers?: Record<string, string> } }
    const token = context.req?.headers?.authorization

    if (token && options.request.http) {
      options.request.http.headers.set('authorization', token)
    }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        server: {
          // Forward incoming request to datasource context
          context: ({ req }: { req: Request }) => ({ req }),
          graphiql: config.get<string>('nodeEnv') !== 'production',
          // cors: {
          //   // origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
          //   origin: config.get<string>('frontendUrl'),
          //   credentials: true,
          // },
        },
        gateway: {
          // IntrospectAndCompose fetches each subgraph's schema at startup
          // and stitches them into a single unified schema
          supergraphSdl: new IntrospectAndCompose({
            subgraphs: [
              {
                name: 'auth',
                url:  config.get<string>('services.auth'),
              },
              {
                name: 'chat',
                url:  config.get<string>('services.chat'),
              },
            ],
          }),
          // Use our custom datasource that forwards the auth header
          buildService({ url }) {
            return new AuthenticatedDataSource({ url })
          },
        },
      }),
    }),
  ],
})
export class AppModule {}
