import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import {
  AuthPayload,
  ValidateTokenPayload,
  RegisterInput,
  LoginInput,
} from './auth.types';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  // ── Mutations ─────────────────────────────────────────────

  @Mutation(() => AuthPayload, {
    description: 'Register a new user. Returns JWT + user info.',
  })
  async register(
    @Args('input') input: RegisterInput,
  ): Promise<AuthPayload> {
    return this.authService.register(input);
  }

  @Mutation(() => AuthPayload, {
    description: 'Login with email & password. Returns JWT + user info.',
  })
  async login(
    @Args('input') input: LoginInput,
  ): Promise<AuthPayload> {
    return this.authService.login(input);
  }

  // ── Queries ───────────────────────────────────────────────

  @Query(() => ValidateTokenPayload, {
    description:
      'Validate a JWT. Called by other services to verify requests. ' +
      'Returns { valid: true, user } on success or { valid: false } on failure.',
  })
  async validateToken(
    @Args('token') token: string,
  ): Promise<ValidateTokenPayload> {
    return this.authService.validateToken(token);
  }
}
