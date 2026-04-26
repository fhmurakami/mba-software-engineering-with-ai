import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let usersService: UsersService;
  let mailService: MailService;

  const mockPrismaService = {
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
    user: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    channel: {
      create: jest.fn(),
    },
    token: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    extractSlugFromEmail: jest.fn().mockReturnValue('test-user'),
  };

  const mockMailService = {
    sendUserConfirmation: jest.fn(),
    sendPasswordReset: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: MailService, useValue: mockMailService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    usersService = module.get<UsersService>(UsersService);
    mailService = module.get<MailService>(MailService);
    
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should throw ConflictException if user exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '1', email: 'test@test.com' });
      
      await expect(service.signup({ email: 'test@test.com', password: 'password' }))
        .rejects.toThrow(ConflictException);
    });

    it('should create user, channel and send confirmation email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({ id: 'user-id', email: 'test@test.com' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      
      const result = await service.signup({ email: 'test@test.com', password: 'password' });

      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockPrismaService.channel.create).toHaveBeenCalled();
      expect(mockPrismaService.token.create).toHaveBeenCalled();
      expect(mockMailService.sendUserConfirmation).toHaveBeenCalled();
      expect(result.message).toContain('sucesso');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      
      await expect(service.login({ email: 'test@test.com', password: 'password' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if email not confirmed', async () => {
      const user = { id: '1', email: 'test@test.com', password: 'hashed-password', isConfirmed: false };
      mockUsersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      await expect(service.login({ email: 'test@test.com', password: 'password' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should return access token for valid credentials', async () => {
      const user = { id: '1', email: 'test@test.com', password: 'hashed-password', isConfirmed: true };
      mockUsersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      const result = await service.login({ email: 'test@test.com', password: 'password' });

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-jwt-token');
    });
  });
});
