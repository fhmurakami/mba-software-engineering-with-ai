import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {}, // Mock
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractSlugFromEmail', () => {
    it('should extract slug from simple email', () => {
      expect(service.extractSlugFromEmail('john.doe@example.com')).toBe('john-doe');
    });

    it('should handle special characters by replacing with dash', () => {
      expect(service.extractSlugFromEmail('john.doe+extra@example.com')).toBe('john-doe-extra');
    });

    it('should convert to lowercase', () => {
      expect(service.extractSlugFromEmail('John.Doe@Example.com')).toBe('john-doe');
    });

    it('should handle multiple consecutive special characters', () => {
      expect(service.extractSlugFromEmail('john...doe@example.com')).toBe('john-doe');
    });
  });
});
