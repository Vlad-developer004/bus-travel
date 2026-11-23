import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createTransport, Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; cid?: string }[];
}

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private readonly transport: Transporter;
  private readonly dryRun: Transporter = createTransport({ jsonTransport: true });
  private readonly from: string;
  private readonly mailbox?: string;
  readonly outbox: MailMessage[] = [];

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get<string>('MAIL_FROM') ?? 'BusTravel <no-reply@bustravel.local>';
    this.transport = host
      ? createTransport({
          host,
          port: Number(config.get('SMTP_PORT') ?? 587),
          secure: Number(config.get('SMTP_PORT')) === 465,
          auth: { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASSWORD') },
        })
      : createTransport({ jsonTransport: true });
    if (!host) {
      this.log.warn('SMTP_HOST is not set: emails are not delivered');
      const env = config.get<string>('NODE_ENV');
      if (env !== 'production' && env !== 'test') {
        this.mailbox = join(process.cwd(), '.mail');
        this.log.log(`Emails are saved to ${this.mailbox}`);
      }
    }
  }

  private save(m: MailMessage) {
    if (!this.mailbox) return;
    try {
      mkdirSync(this.mailbox, { recursive: true });
      const safe = (x: string) => x.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
      let html = m.html;
      for (const a of m.attachments ?? []) if (a.cid) html = html.replace(`cid:${a.cid}`, `data:image/png;base64,${a.content.toString('base64')}`);
      writeFileSync(join(this.mailbox, `${Date.now()}-${safe(m.to)}-${safe(m.subject)}.html`), `<!-- to: ${m.to} | subject: ${m.subject} -->\n${html}`);
    } catch {
    }
  }

  async send(message: MailMessage): Promise<void> {
    try {
      const reserved = /@(example\.(com|org|net)|.*\.(local|test|invalid|localhost))$/i.test(message.to);
      await (reserved ? this.dryRun : this.transport).sendMail({ from: this.from, ...message });
      this.outbox.push(message);
      this.save(message);
      if (this.outbox.length > 50) this.outbox.shift();
      this.log.log(`Email "${message.subject}" sent`);
    } catch (err) {
      this.log.error(`Email "${message.subject}" failed: ${(err as Error).message}`);
    }
  }
}

@Global()
@Module({ providers: [MailService], exports: [MailService] })
export class MailModule {}
