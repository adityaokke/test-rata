import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UserRole } from 'src/generated/prisma/enums';

// ── Mocks ─────────────────────────────────────────────────────

const mockUser = {
  id:        'uuid-1234',
  email:     'test@example.com',
  password:  '$2b$12$hashedpassword',
  role:      UserRole.CUSTOMER,  // ← add role
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create:     jest.fn(),
  },
};

const mockJwt = {
  sign:   jest.fn().mockReturnValue('signed.jwt.token'),
  verify: jest.fn(),
};

// ── Test suite ────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService,    useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── register ───────────────────────────────────────────────

  describe('register', () => {
    it('creates a user and returns accessToken + user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email:    'test@example.com',
        password: 'securepassword123',
      });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('creates a user with CUSTOMER role by default', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      await service.register({ email: 'a@b.com', password: 'securepassword123' });

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.role).toBe(UserRole.CUSTOMER);
    });

    it('creates a user with AGENT role when provided', async () => {
      const agentUser = { ...mockUser, role: UserRole.AGENT }
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(agentUser);

      const result = await service.register({
        email:    'agent@example.com',
        password: 'securepassword123',
        role:     UserRole.AGENT,
      });

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.role).toBe(UserRole.AGENT);
      expect(result.user.role).toBe(UserRole.AGENT);
    });

    it('hashes the password before storing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      await service.register({ email: 'a@b.com', password: 'securepassword123' });

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      const storedPassword: string = createCall.data.password;

      expect(storedPassword).not.toBe('securepassword123');
      expect(await bcrypt.compare('securepassword123', storedPassword)).toBe(true);
    });

    it('includes role in the signed JWT', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      await service.register({ email: 'a@b.com', password: 'securepassword123' });

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.CUSTOMER }),
      );
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({ email: 'test@example.com', password: 'securepassword123' }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when password is too short', async () => {
      await expect(
        service.register({ email: 'a@b.com', password: 'short' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  // ── login ──────────────────────────────────────────────────

  describe('login', () => {
    it('returns accessToken + user on valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const result = await service.login({
        email:    'test@example.com',
        password: 'correctpassword',
      });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('includes role in the signed JWT on login', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      await service.login({ email: 'test@example.com', password: 'correctpassword' });

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.CUSTOMER }),
      );
    });

    it('throws UnauthorizedException when email not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns same error message for missing email and wrong password (no leakage)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      let err1: Error | null = null;
      try {
        await service.login({ email: 'nobody@example.com', password: 'x' });
      } catch (e) { err1 = e as Error }

      const hashedPassword = await bcrypt.hash('correctpassword', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, password: hashedPassword });
      let err2: Error | null = null;
      try {
        await service.login({ email: 'test@example.com', password: 'wrongpassword' });
      } catch (e) { err2 = e as Error }

      expect(err1?.message).toBe(err2?.message);
    });
  });

  // ── validateToken ──────────────────────────────────────────

  describe('validateToken', () => {
    it('returns { valid: true, user } for a valid token', async () => {
      mockJwt.verify.mockReturnValue({
        sub:   mockUser.id,
        email: mockUser.email,
        role:  mockUser.role,   // ← add role to payload
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateToken('valid.token');

      expect(result.valid).toBe(true);
      expect(result.user?.email).toBe(mockUser.email);
      expect(result.user?.role).toBe(UserRole.CUSTOMER);  // ← assert role
    });

    it('returns { valid: false } when token is expired/invalid', async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error('jwt expired') });

      const result = await service.validateToken('expired.token');

      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('returns { valid: false } when user no longer exists', async () => {
      mockJwt.verify.mockReturnValue({
        sub:   'deleted-user-id',
        email: 'gone@example.com',
        role:  UserRole.CUSTOMER,
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateToken('valid.token.for.deleted.user');

      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
    });
  });
});