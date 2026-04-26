import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { TokenType } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private mailService: MailService,
    private jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const slug = this.usersService.extractSlugFromEmail(dto.email);

    // Atomic transaction for User + Channel + Confirmation Token
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
        },
      });

      await tx.channel.create({
        data: {
          name: dto.email.split('@')[0],
          slug: slug,
          userId: newUser.id,
        },
      });

      const confirmationToken = randomUUID();
      await tx.token.create({
        data: {
          token: confirmationToken,
          type: TokenType.CONFIRMATION,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          userId: newUser.id,
        },
      });

      return { user: newUser, token: confirmationToken };
    });

    await this.mailService.sendUserConfirmation(user.user.email, user.token);

    return { message: 'Usuário cadastrado com sucesso. Verifique seu e-mail.' };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.isConfirmed) {
      throw new UnauthorizedException('Por favor, confirme seu e-mail antes de fazer login');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async confirmEmail(token: string) {
    const tokenRecord = await this.prisma.token.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.type !== TokenType.CONFIRMATION) {
      throw new BadRequestException('Token inválido');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Token expirado');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { isConfirmed: true },
      }),
      this.prisma.token.delete({
        where: { id: tokenRecord.id },
      }),
    ]);

    return { message: 'E-mail confirmado com sucesso!' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists for security, but we'll return success anyway
      return { message: 'Se o e-mail existir, um link de recuperação será enviado.' };
    }

    const resetToken = randomUUID();
    await this.prisma.token.create({
      data: {
        token: resetToken,
        type: TokenType.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        userId: user.id,
      },
    });

    await this.mailService.sendPasswordReset(user.email, resetToken);

    return { message: 'Se o e-mail existir, um link de recuperação será enviado.' };
  }

  async resetPassword(token: string, password: string) {
    const tokenRecord = await this.prisma.token.findUnique({
      where: { token },
    });

    if (!tokenRecord || tokenRecord.type !== TokenType.PASSWORD_RESET) {
      throw new BadRequestException('Token inválido');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Token expirado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.token.deleteMany({
        where: { userId: tokenRecord.userId, type: TokenType.PASSWORD_RESET },
      }),
    ]);

    return { message: 'Senha redefinida com sucesso!' };
  }
}
