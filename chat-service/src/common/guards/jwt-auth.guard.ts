import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GqlExecutionContext } from '@nestjs/graphql'
import { JwtService } from '@nestjs/jwt'
import type { IncomingMessage } from 'node:http'

interface AuthenticatedRequest extends IncomingMessage {
  user?: { sub: string; email: string }
  headers: IncomingMessage['headers'] & { authorization?: string }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name)

  constructor(
    private readonly jwt:    JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context)
    const req = ctx.getContext<{ req: AuthenticatedRequest }>().req

    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Authorization header')
    }

    const token = authHeader.slice(7)
    try {
      req.user = this.jwt.verify<{ sub: string; email: string }>(token, {
        secret: this.config.get<string>('jwt.secret'),
      })
      return true
    } catch (err) {
      this.logger.warn(`JWT verification failed: ${err}`)
      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}
