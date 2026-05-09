import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import * as jose from 'jose';
import { LtiService } from './lti.service';
import { AuthService } from '../auth/auth.service';
import { User } from '../../database/entities/user.entity';

/**
 * LTI Controller
 *
 * Handles LTI 1.3 OIDC login flow:
 * 1. Platform sends login initiation to /api/lti/login
 * 2. We redirect to platform's auth endpoint
 * 3. Platform redirects back to /api/lti/launch with id_token
 * 4. We validate and create session, redirect to app
 *
 * Also exposes JWKS endpoint for platforms to verify our signatures
 */
@Controller('lti')
export class LtiController {
  private readonly logger = new Logger(LtiController.name);
  private privateKey: CryptoKey | null = null;
  private publicKey: CryptoKey | null = null;
  private keyId: string;

  constructor(
    private ltiService: LtiService,
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    this.keyId =
      this.configService.get<string>('lti.keyId') || 'Axis-lti-key-1';
    void this.initializeKeys();
  }

  /**
   * Initialize RSA keypair for JWT signing
   * In production, these should be loaded from environment/secrets
   */
  private async initializeKeys(): Promise<void> {
    const privateKeyPem = this.configService.get<string>('lti.privateKey');
    const publicKeyPem = this.configService.get<string>('lti.publicKey');

    if (privateKeyPem && publicKeyPem) {
      try {
        this.privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');
        this.publicKey = await jose.importSPKI(publicKeyPem, 'RS256');
        this.logger.log('LTI keys loaded from configuration');
      } catch (error) {
        this.logger.error('Failed to load LTI keys from configuration', error);
      }
    } else {
      // Generate ephemeral keys for development
      // WARNING: These will change on restart, breaking existing registrations
      this.logger.warn(
        'No LTI keys configured. Generating ephemeral keys (development only)',
      );
      const { privateKey, publicKey } = await jose.generateKeyPair('RS256', {
        modulusLength: 2048,
      });
      this.privateKey = privateKey;
      this.publicKey = publicKey;
    }
  }

  /**
   * OIDC Login Initiation
   * Platform calls this to start the authentication flow
   */
  @Get('login')
  @Post('login')
  async login(
    @Query('iss') issuerQuery: string | undefined,
    @Query('login_hint') loginHintQuery: string | undefined,
    @Query('target_link_uri') targetLinkUriQuery: string | undefined,
    @Query('lti_message_hint') ltiMessageHintQuery: string | undefined,
    @Query('client_id') clientIdQuery: string | undefined,
    @Body() body: Record<string, string> | undefined,
    @Res() res: express.Response,
  ): Promise<void> {
    // Handle both GET and POST (platforms use either)
    const issuer = body?.iss || issuerQuery;
    const loginHint = body?.login_hint || loginHintQuery;
    const targetLinkUri = body?.target_link_uri || targetLinkUriQuery;
    const ltiMessageHint = body?.lti_message_hint || ltiMessageHintQuery;
    const clientId = body?.client_id || clientIdQuery;

    if (!issuer || !loginHint) {
      throw new BadRequestException(
        'Missing required parameters: iss, login_hint',
      );
    }

    // We need either client_id from request or default to issuer lookup
    // In LTI 1.3, client_id should be provided by the platform
    if (!clientId) {
      throw new BadRequestException('Missing required parameter: client_id');
    }

    try {
      const { redirectUrl } = await this.ltiService.initiateLogin(
        issuer,
        clientId,
        loginHint,
        targetLinkUri || null,
        ltiMessageHint || null,
      );

      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('LTI login initiation failed', error);
      res.status(HttpStatus.BAD_REQUEST).json({
        error: 'LTI login failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * LTI Launch (OIDC callback)
   * Platform redirects here with id_token after authentication
   */
  @Post('launch')
  async launch(
    @Body('id_token') idToken: string,
    @Body('state') state: string,
    @Res() res: express.Response,
  ): Promise<void> {
    if (!idToken || !state) {
      throw new BadRequestException(
        'Missing required parameters: id_token, state',
      );
    }

    try {
      const session = await this.ltiService.processLaunch(idToken, state);

      if (!session.success) {
        throw new Error('Launch processing failed');
      }

      // Create a JWT for the user and set as cookie
      // We need to look up the user to create a proper session
      const user = await this.getUserById(session.userId);
      if (!user) {
        throw new Error('User not found after LTI launch');
      }

      // Cast: getUserById is a workaround until UsersService is injected properly
      const authResult = this.authService.login(user as unknown as User);
      const isProduction =
        this.configService.get('app.nodeEnv') === 'production';

      // Set the auth cookie
      res.cookie('access_token', authResult.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      // Redirect to the appropriate page
      const frontendUrl = this.configService.get<string>('app.frontendUrl');
      const redirectUrl = `${frontendUrl}${session.redirectUrl}`;

      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('LTI launch failed', error);

      const frontendUrl = this.configService.get<string>('app.frontendUrl');
      res.redirect(
        `${frontendUrl}/login?error=lti_launch_failed&message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`,
      );
    }
  }

  /**
   * JWKS Endpoint
   * Platforms use this to verify our JWT signatures
   */
  @Get('.well-known/jwks.json')
  async jwks(): Promise<{ keys: jose.JWK[] }> {
    if (!this.publicKey) {
      await this.initializeKeys();
    }

    if (!this.publicKey) {
      return { keys: [] };
    }

    const jwk = await jose.exportJWK(this.publicKey);
    jwk.kid = this.keyId;
    jwk.use = 'sig';
    jwk.alg = 'RS256';

    return { keys: [jwk] };
  }

  /**
   * Tool Configuration Endpoint
   * Returns configuration for platform admins to register Axis
   */
  @Get('config')
  getConfiguration(): Record<string, unknown> {
    const config = this.ltiService.getToolConfiguration();
    return {
      ...config,
      publicKey: this.publicKey
        ? 'Available at JWKS endpoint'
        : 'Not configured',
      jwksUri: config.jwksUrl,
      oidcInitiationUrl: config.oidcLoginUrl,
      targetLinkUri: config.launchUrl,
      messages: [
        {
          type: 'LtiResourceLinkRequest',
          target_link_uri: config.launchUrl,
        },
        {
          type: 'LtiDeepLinkingRequest',
          target_link_uri: config.deepLinkUrl,
        },
      ],
    };
  }

  /**
   * Helper to get user by ID (for session creation)
   */
  private async getUserById(userId: string): Promise<{ id: string } | null> {
    // This is a workaround since we don't have direct access to UserRepository
    // In production, inject UsersService properly
    interface PgClient {
      connect(): Promise<void>;
      query(sql: string, params: string[]): Promise<{ rows: { id: string }[] }>;
      end(): Promise<void>;
    }
    interface PgModule {
      Client: new (config: Record<string, unknown>) => PgClient;
    }
    try {
      const { default: pg } = (await import('pg')) as { default: PgModule };
      const dbConfig: Record<string, unknown> = {
        host: this.configService.get<string>('database.host'),
        port: this.configService.get<number>('database.port'),
        user: this.configService.get<string>('database.username'),
        password: this.configService.get<string>('database.password'),
        database: this.configService.get<string>('database.database'),
      };
      const client = new pg.Client(dbConfig);
      await client.connect();
      const result = await client.query('SELECT * FROM users WHERE id = $1', [
        userId,
      ]);
      await client.end();
      return result.rows[0] ?? null;
    } catch {
      return { id: userId };
    }
  }
}
