import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/modules/prisma/prisma.service';

import { MailService } from './../src/modules/mail/mail.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue({
        sendUserConfirmation: jest.fn().mockResolvedValue(null),
        sendPasswordReset: jest.fn().mockResolvedValue(null),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  const testUser = {
    email: 'test@example.com',
    password: 'password123',
  };

  it('/auth/signup (POST) - success', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(testUser)
      .expect(201);

    expect(response.body.message).toContain('sucesso');
    
    const user = await prisma.user.findUnique({
      where: { email: testUser.email },
      include: { channel: true },
    });
    expect(user).toBeDefined();
    expect(user.channel).toBeDefined();
    expect(user.channel.slug).toBe('test');
  });

  it('/auth/signup (POST) - conflict', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send(testUser);
    
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(testUser)
      .expect(409);
  });

  it('/auth/login (POST) - fail not confirmed', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send(testUser);
    
    await request(app.getHttpServer())
      .post('/auth/login')
      .send(testUser)
      .expect(401);
  });

  it('/auth/confirm-email (POST) - success', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send(testUser);
    const tokenRecord = await prisma.token.findFirst({
      where: { user: { email: testUser.email } },
    });

    await request(app.getHttpServer())
      .post('/auth/confirm-email')
      .send({ token: tokenRecord.token })
      .expect(200);

    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    expect(user.isConfirmed).toBe(true);
  });

  it('/auth/login (POST) - success', async () => {
    // Signup
    await request(app.getHttpServer()).post('/auth/signup').send(testUser);
    
    // Confirm
    const tokenRecord = await prisma.token.findFirst({
      where: { user: { email: testUser.email } },
    });
    await prisma.user.update({
      where: { email: testUser.email },
      data: { isConfirmed: true },
    });

    // Login
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(testUser)
      .expect(200);

    expect(response.body).toHaveProperty('access_token');
  });
});
