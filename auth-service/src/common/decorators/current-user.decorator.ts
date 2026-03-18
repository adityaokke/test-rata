import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Usage in a resolver:
 *   @UseGuards(JwtAuthGuard)
 *   @Query(() => UserType)
 *   me(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{ req: { user: JwtPayload } }>().req.user;
  },
);
