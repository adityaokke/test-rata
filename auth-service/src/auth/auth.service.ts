import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterInput, LoginInput } from './auth.types';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UserRole } from 'src/generated/prisma/enums';

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterInput) {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        role: input.role ?? UserRole.CUSTOMER, // ← use provided role or default
      },
    });

    const accessToken = this.signToken(user.id, user.email, user.role);
    return { accessToken, user };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      // Avoid leaking whether email exists
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(input.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.signToken(user.id, user.email, user.role);
    return { accessToken, user };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwt.verify<{ sub: string; email: string }>(token);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        return { valid: false, user: undefined };
      }

      return { valid: true, user };
    } catch {
      return { valid: false, user: undefined };
    }
  }

  private signToken(userId: string, email: string, role: UserRole): string {
    return this.jwt.sign({ sub: userId, email, role });
  }
}
