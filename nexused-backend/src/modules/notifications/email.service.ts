import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * WHY we check preferences before querying user data here:
 * The EventListeners pass preferences directly to keep the email service
 * stateless and dependency-light. It doesn't need a UserRepository —
 * the caller resolves preferences before calling sendEmail.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromAddress: string;
  private replyTo: string;
  private enabled: boolean;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('email.resendApiKey');
    this.fromAddress =
      this.configService.get<string>('email.fromAddress') ??
      'NexusEd <noreply@nexused.app>';
    this.replyTo = this.configService.get<string>('email.replyTo') ?? '';
    this.enabled = this.configService.get<boolean>('email.enabled') ?? true;

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY not set — email notifications disabled. Set it in .env to enable.',
      );
      this.enabled = false;
    }

    this.resend = new Resend(apiKey);
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(
        `[Email disabled] Would send to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}: ${options.subject}`,
      );
      return;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        ...(options.replyTo || this.replyTo
          ? { replyTo: options.replyTo ?? this.replyTo }
          : {}),
      });

      if (error) {
        const toStr = Array.isArray(options.to)
          ? options.to.join(', ')
          : options.to;
        this.logger.error(`Resend error sending to ${toStr}: ${error.message}`);
      } else {
        const toDisplay = Array.isArray(options.to)
          ? `${options.to.length} recipients`
          : options.to;
        this.logger.debug(`Email sent to ${toDisplay}: ${options.subject}`);
      }
    } catch (err) {
      // Log but never throw — email failure must not break the caller's flow
      this.logger.error('Unexpected error sending email', err);
    }
  }
}
