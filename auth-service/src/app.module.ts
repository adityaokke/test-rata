import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './common/prisma/prisma.module';
import configuration from './config/configuration';
import { UsersModule } from './users/users.module';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from "ms";

// TODO: research how to use config here
// care about race promise in config loading and app initialization
@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration] }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      graphiql: process.env.NODE_ENV !== 'production',
      // autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      autoSchemaFile: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as StringValue },
    }),
    AuthModule,
    PrismaModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
