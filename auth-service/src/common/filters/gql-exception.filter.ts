import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GqlHttpExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const contextType = host.getType();

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : (response as Record<string, string>).message;

      return new GraphQLError(message, {
        extensions: { code: this.mapCode(exception.getStatus()) },
      });
    }

    // Extract useful info from host for debugging
    console.error('[GqlExceptionFilter] context type:', contextType);
    console.error('[GqlExceptionFilter] Unhandled error:', exception);

    return new GraphQLError('Internal server error', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  private mapCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
    };
    return map[status] ?? 'INTERNAL_SERVER_ERROR';
  }
}
