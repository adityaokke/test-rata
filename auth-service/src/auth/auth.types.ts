import { ObjectType, Field, InputType } from '@nestjs/graphql';

// ── Output types ──────────────────────────────────────────────

@ObjectType()
export class UserType {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken: string;

  @Field(() => UserType)
  user: UserType;
}

@ObjectType()
export class ValidateTokenPayload {
  @Field()
  valid: boolean;

  @Field(() => UserType, { nullable: true })
  user?: UserType;
}

// ── Input types ───────────────────────────────────────────────

@InputType()
export class RegisterInput {
  @Field()
  email: string;

  @Field()
  password: string;
}

@InputType()
export class LoginInput {
  @Field()
  email: string;

  @Field()
  password: string;
}
