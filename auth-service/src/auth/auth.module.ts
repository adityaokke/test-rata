import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { GqlHttpExceptionFilter } from 'src/common/filters/gql-exception.filter';

@Module({
  providers: [
    AuthService,
    AuthResolver,
    {
      provide: APP_FILTER,
      useClass: GqlHttpExceptionFilter,
    },
  ],
})
export class AuthModule {}
