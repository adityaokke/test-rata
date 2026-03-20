import {
  ObjectType,
  Field,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';
import { UserRole } from 'src/generated/prisma/enums';

// ── Output types ──────────────────────────────────────────────
registerEnumType(UserRole, { name: 'UserRole' });

@ObjectType()
export class UserType {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field(() => UserRole)
  role: UserRole;

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

  @Field(() => UserRole, { nullable: true })
  role?: UserRole;
}

@InputType()
export class LoginInput {
  @Field()
  email: string;

  @Field()
  password: string;
}
