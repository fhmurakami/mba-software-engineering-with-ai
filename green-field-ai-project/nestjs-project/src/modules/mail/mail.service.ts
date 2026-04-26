import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendUserConfirmation(email: string, token: string) {
    const url = `http://localhost:3000/auth/confirm?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Bem-vindo ao StreamTube! Confirme seu e-mail',
      template: './confirmation',
      context: {
        url,
      },
    });
  }

  async sendPasswordReset(email: string, token: string) {
    const url = `http://localhost:3000/auth/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Recuperação de Senha - StreamTube',
      template: './reset-password',
      context: {
        url,
      },
    });
  }
}
