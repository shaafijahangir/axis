import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as jose from 'jose';
import * as crypto from 'crypto';
import {
  LtiPlatform,
  LtiPlatformStatus,
  LtiDeployment,
  LtiContext,
  LtiUser,
  LtiState,
} from './entities';
import { User, UserRole } from '../../database/entities/user.entity';
import {
  CreateLtiPlatformInput,
  UpdateLtiPlatformInput,
  CreateLtiDeploymentInput,
  LinkLtiContextInput,
  LtiToolConfiguration,
  LtiPlatformInfo,
  LtiLaunchSession,
} from './dto/lti.types';

/**
 * LTI Role URIs to Axis role mapping
 * Based on LTI 1.3 spec role URIs
 */
const LTI_ROLE_MAP: Record<string, UserRole> = {
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor':
    UserRole.INSTRUCTOR,
  'http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper':
    UserRole.INSTRUCTOR,
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner': UserRole.STUDENT,
  'http://purl.imsglobal.org/vocab/lis/v2/membership#Mentor': UserRole.TA,
  'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator':
    UserRole.ADMIN,
  'http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator':
    UserRole.ADMIN,
};

/**
 * LTI 1.3 Service
 *
 * Handles:
 * - Platform registration and management
 * - OIDC login flow (state/nonce generation)
 * - JWT validation and launch processing
 * - User provisioning and role mapping
 * - Context (course) linking
 */
@Injectable()
export class LtiService {
  private readonly logger = new Logger(LtiService.name);

  constructor(
    @InjectRepository(LtiPlatform)
    private platformRepo: Repository<LtiPlatform>,
    @InjectRepository(LtiDeployment)
    private deploymentRepo: Repository<LtiDeployment>,
    @InjectRepository(LtiContext)
    private contextRepo: Repository<LtiContext>,
    @InjectRepository(LtiUser)
    private ltiUserRepo: Repository<LtiUser>,
    @InjectRepository(LtiState)
    private stateRepo: Repository<LtiState>,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  // ============================================================
  // PLATFORM MANAGEMENT
  // ============================================================

  async createPlatform(
    tenantId: string,
    input: CreateLtiPlatformInput,
  ): Promise<LtiPlatform> {
    const platform = this.platformRepo.create({
      tenantId,
      ...input,
      status: LtiPlatformStatus.PENDING,
    });
    return this.platformRepo.save(platform);
  }

  async updatePlatform(
    tenantId: string,
    input: UpdateLtiPlatformInput,
  ): Promise<LtiPlatform> {
    const platform = await this.platformRepo.findOneOrFail({
      where: { id: input.id, tenantId },
    });

    if (input.name) platform.name = input.name;
    if (input.authorizationEndpoint)
      platform.authorizationEndpoint = input.authorizationEndpoint;
    if (input.tokenEndpoint) platform.tokenEndpoint = input.tokenEndpoint;
    if (input.jwksEndpoint) platform.jwksEndpoint = input.jwksEndpoint;
    if (input.status) platform.status = input.status;

    return this.platformRepo.save(platform);
  }

  async deletePlatform(tenantId: string, platformId: string): Promise<boolean> {
    const result = await this.platformRepo.delete({ id: platformId, tenantId });
    return (result.affected ?? 0) > 0;
  }

  async getPlatforms(tenantId: string): Promise<LtiPlatform[]> {
    return this.platformRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async getPlatform(
    tenantId: string,
    platformId: string,
  ): Promise<LtiPlatform | null> {
    return this.platformRepo.findOne({
      where: { id: platformId, tenantId },
      relations: ['deployments'],
    });
  }

  async getPlatformByIssuer(
    tenantId: string,
    issuer: string,
    clientId: string,
  ): Promise<LtiPlatform | null> {
    return this.platformRepo.findOne({
      where: { tenantId, issuer, clientId },
    });
  }

  async getPlatformInfo(tenantId: string): Promise<LtiPlatformInfo[]> {
    const platforms = await this.platformRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    if (platforms.length === 0) return [];

    // Was N+1: one COUNT per platform × 2 (deployments + users). Now 2
    // GROUP-BY queries regardless of platform count.
    const platformIds = platforms.map((p) => p.id);

    const deploymentRows = await this.deploymentRepo
      .createQueryBuilder('d')
      .select('d.platformId', 'platformId')
      .addSelect('COUNT(*)', 'count')
      .where('d.platformId IN (:...ids)', { ids: platformIds })
      .groupBy('d.platformId')
      .getRawMany<{ platformId: string; count: string }>();

    const userRows = await this.ltiUserRepo
      .createQueryBuilder('u')
      .select('u.platformId', 'platformId')
      .addSelect('COUNT(*)', 'count')
      .where('u.platformId IN (:...ids)', { ids: platformIds })
      .groupBy('u.platformId')
      .getRawMany<{ platformId: string; count: string }>();

    const deploymentMap = new Map(
      deploymentRows.map((r) => [r.platformId, parseInt(r.count, 10)]),
    );
    const userMap = new Map(
      userRows.map((r) => [r.platformId, parseInt(r.count, 10)]),
    );

    return platforms.map((platform) => ({
      id: platform.id,
      name: platform.name,
      issuer: platform.issuer,
      clientId: platform.clientId,
      status: platform.status,
      deploymentCount: deploymentMap.get(platform.id) ?? 0,
      userCount: userMap.get(platform.id) ?? 0,
      createdAt: platform.createdAt,
    }));
  }

  // ============================================================
  // DEPLOYMENT MANAGEMENT
  // ============================================================

  async createDeployment(
    tenantId: string,
    input: CreateLtiDeploymentInput,
  ): Promise<LtiDeployment> {
    // Verify platform belongs to tenant
    await this.platformRepo.findOneOrFail({
      where: { id: input.platformId, tenantId },
    });

    const deployment = this.deploymentRepo.create({
      tenantId,
      platformId: input.platformId,
      deploymentId: input.deploymentId,
      label: input.label,
      isActive: true,
    });
    return this.deploymentRepo.save(deployment);
  }

  async getDeployments(
    tenantId: string,
    platformId: string,
  ): Promise<LtiDeployment[]> {
    return this.deploymentRepo.find({
      where: { tenantId, platformId },
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================================
  // OIDC LOGIN FLOW
  // ============================================================

  /**
   * Initiate OIDC login flow
   * Called when platform sends login initiation request
   */
  async initiateLogin(
    issuer: string,
    clientId: string,
    loginHint: string,
    targetLinkUri: string | null,
    ltiMessageHint: string | null,
  ): Promise<{ redirectUrl: string; state: string }> {
    // Find the platform
    // Note: We need to find by issuer+clientId, but we don't know tenantId yet
    // In practice, platforms are unique across tenants, so this should work
    const platform = await this.platformRepo.findOne({
      where: { issuer, clientId, status: LtiPlatformStatus.ACTIVE },
    });

    if (!platform) {
      throw new UnauthorizedException(
        `Unknown platform: ${issuer} / ${clientId}`,
      );
    }

    // Generate state and nonce
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    // Store state for validation during launch
    const stateExpiry =
      this.configService.get<number>('lti.stateExpiry') || 600;
    const expiresAt = new Date(Date.now() + stateExpiry * 1000);

    await this.stateRepo.save({
      state,
      platformId: platform.id,
      tenantId: platform.tenantId,
      nonce,
      targetLinkUri,
      loginHint,
      ltiMessageHint,
      expiresAt,
    });

    // Build redirect URL to platform's auth endpoint
    const toolUrl = this.configService.get<string>('lti.toolUrl');
    const launchPath = this.configService.get<string>('lti.launchPath');
    const redirectUri = `${toolUrl}${launchPath}`;

    const params = new URLSearchParams({
      scope: 'openid',
      response_type: 'id_token',
      response_mode: 'form_post',
      prompt: 'none',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      nonce,
      login_hint: loginHint,
    });

    if (ltiMessageHint) {
      params.set('lti_message_hint', ltiMessageHint);
    }

    const redirectUrl = `${platform.authorizationEndpoint}?${params.toString()}`;

    return { redirectUrl, state };
  }

  // ============================================================
  // LAUNCH PROCESSING
  // ============================================================

  /**
   * Process LTI launch (validate JWT and create session)
   */
  async processLaunch(
    idToken: string,
    state: string,
  ): Promise<LtiLaunchSession> {
    // Retrieve and validate state
    const storedState = await this.stateRepo.findOne({
      where: { state, expiresAt: MoreThan(new Date()) },
    });

    if (!storedState) {
      throw new UnauthorizedException('Invalid or expired state');
    }

    // Get platform
    const platform = await this.platformRepo.findOneOrFail({
      where: { id: storedState.platformId },
    });

    // Fetch platform's public keys
    const jwks = await this.fetchPlatformJwks(platform.jwksEndpoint);

    // Verify JWT
    let payload: jose.JWTPayload;
    try {
      const result = await jose.jwtVerify(idToken, jwks, {
        issuer: platform.issuer,
        audience: platform.clientId,
      });
      payload = result.payload;
    } catch (error) {
      this.logger.error('JWT verification failed', error);
      throw new UnauthorizedException('Invalid LTI token');
    }

    // Verify nonce
    if (payload.nonce !== storedState.nonce) {
      throw new UnauthorizedException('Invalid nonce');
    }

    // Delete used state
    await this.stateRepo.delete({ state });

    // Process the launch
    return this.handleLaunchPayload(
      platform,
      storedState.tenantId,
      payload,
      storedState.targetLinkUri,
    );
  }

  /**
   * Handle the verified launch payload
   */
  private async handleLaunchPayload(
    platform: LtiPlatform,
    tenantId: string,
    payload: jose.JWTPayload,
    targetLinkUri: string | null,
  ): Promise<LtiLaunchSession> {
    // Extract LTI claims
    const sub = payload.sub as string;
    const deploymentId = payload[
      'https://purl.imsglobal.org/spec/lti/claim/deployment_id'
    ] as string;
    const context = payload[
      'https://purl.imsglobal.org/spec/lti/claim/context'
    ] as
      | { id?: string; title?: string; label?: string; type?: string[] }
      | undefined;
    const roles = (payload['https://purl.imsglobal.org/spec/lti/claim/roles'] ||
      []) as string[];
    const email = payload.email as string | undefined;
    const name = payload.name as string | undefined;
    const givenName = payload.given_name as string | undefined;
    const familyName = payload.family_name as string | undefined;

    // Get or create deployment
    let deployment = await this.deploymentRepo.findOne({
      where: { platformId: platform.id, deploymentId },
    });

    if (!deployment) {
      deployment = await this.deploymentRepo.save({
        tenantId,
        platformId: platform.id,
        deploymentId,
        isActive: true,
      });
    }

    // Get or create user
    const user = await this.getOrCreateUser(
      platform,
      tenantId,
      sub,
      email,
      name || `${givenName || ''} ${familyName || ''}`.trim(),
      roles,
    );

    // Handle context (course) if present
    let ltiContext: LtiContext | null = null;
    if (context?.id) {
      ltiContext = await this.getOrCreateContext(
        deployment,
        tenantId,
        context.id,
        context.title,
        context.label,
        context.type?.[0],
        payload,
      );
    }

    // Build redirect URL
    let redirectUrl = targetLinkUri || '/home';
    if (ltiContext?.isLinked && ltiContext.sectionId) {
      // Redirect to the linked section
      redirectUrl = `/courses/${ltiContext.sectionId}`;
    }

    // Update platform status to active if it was pending
    if (platform.status === LtiPlatformStatus.PENDING) {
      await this.platformRepo.update(platform.id, {
        status: LtiPlatformStatus.ACTIVE,
      });
    }

    return {
      success: true,
      userId: user.id,
      sectionId: ltiContext?.sectionId || undefined,
      contextTitle: ltiContext?.title || undefined,
      redirectUrl,
    };
  }

  /**
   * Get or create a Axis user from LTI claims
   */
  private async getOrCreateUser(
    platform: LtiPlatform,
    tenantId: string,
    ltiUserId: string,
    email: string | undefined,
    name: string | undefined,
    ltiRoles: string[],
  ): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if we already have a mapping
      let ltiUser = await queryRunner.manager.findOne(LtiUser, {
        where: { platformId: platform.id, ltiUserId },
        relations: ['user'],
      });

      if (ltiUser) {
        // Update last launch time and cached info
        ltiUser.lastLaunchAt = new Date();
        ltiUser.email = email || ltiUser.email;
        ltiUser.name = name || ltiUser.name;
        ltiUser.ltiRoles = ltiRoles;
        await queryRunner.manager.save(ltiUser);
        await queryRunner.commitTransaction();
        return ltiUser.user;
      }

      // Map LTI roles to Axis roles
      const AxisRoles = this.mapLtiRoles(ltiRoles);

      // Try to find existing user by email
      let user: User | null = null;
      if (email) {
        user = await queryRunner.manager.findOne(User, {
          where: { tenantId, email },
        });
      }

      // Create new user if not found
      if (!user) {
        const [firstName, ...lastNameParts] = (name || 'LTI User').split(' ');
        user = queryRunner.manager.create(User, {
          tenantId,
          email: email || `${ltiUserId}@lti.local`,
          firstName: firstName || 'LTI',
          lastName: lastNameParts.join(' ') || 'User',
          roles: AxisRoles,
          passwordHash: '', // LTI users don't need a password
          isActive: true,
        });
        user = await queryRunner.manager.save(user);
      }

      // Create LTI user mapping
      ltiUser = queryRunner.manager.create(LtiUser, {
        tenantId,
        platformId: platform.id,
        ltiUserId,
        userId: user.id,
        email,
        name,
        ltiRoles,
        lastLaunchAt: new Date(),
      });
      await queryRunner.manager.save(ltiUser);

      await queryRunner.commitTransaction();
      return user;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Map LTI role URIs to Axis roles
   */
  private mapLtiRoles(ltiRoles: string[]): UserRole[] {
    const roles = new Set<UserRole>();

    for (const ltiRole of ltiRoles) {
      const mapped = LTI_ROLE_MAP[ltiRole];
      if (mapped) {
        roles.add(mapped);
      }
    }

    // Default to student if no roles mapped
    if (roles.size === 0) {
      roles.add(UserRole.STUDENT);
    }

    return Array.from(roles);
  }

  /**
   * Get or create context (course) from LTI launch
   */
  private async getOrCreateContext(
    deployment: LtiDeployment,
    tenantId: string,
    contextId: string,
    title: string | undefined,
    label: string | undefined,
    contextType: string | undefined,
    payload: jose.JWTPayload,
  ): Promise<LtiContext> {
    let context = await this.contextRepo.findOne({
      where: { deploymentId: deployment.id, contextId },
    });

    // Extract services from payload
    const nrps = payload[
      'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'
    ] as
      | { context_memberships_url?: string; service_versions?: string[] }
      | undefined;
    const ags = payload[
      'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'
    ] as
      | { lineitems?: string; lineitem?: string; scope?: string[] }
      | undefined;

    const services = {
      nrps: nrps
        ? {
            contextMembershipsUrl: nrps.context_memberships_url,
            serviceVersions: nrps.service_versions,
          }
        : undefined,
      ags: ags
        ? {
            lineitemsUrl: ags.lineitems,
            lineitemUrl: ags.lineitem,
            scope: ags.scope,
          }
        : undefined,
    };

    if (context) {
      // Update cached info
      context.title = title || context.title;
      context.label = label || context.label;
      context.services = services;
      return this.contextRepo.save(context);
    }

    // Create new context
    context = this.contextRepo.create({
      tenantId,
      deploymentId: deployment.id,
      contextId,
      title,
      label,
      contextType,
      isLinked: false,
      services,
    });

    return this.contextRepo.save(context);
  }

  // ============================================================
  // CONTEXT LINKING
  // ============================================================

  async linkContext(
    tenantId: string,
    input: LinkLtiContextInput,
  ): Promise<LtiContext> {
    const context = await this.contextRepo.findOneOrFail({
      where: { id: input.contextId, tenantId },
    });

    context.sectionId = input.sectionId;
    context.isLinked = true;

    return this.contextRepo.save(context);
  }

  async unlinkContext(
    tenantId: string,
    contextId: string,
  ): Promise<LtiContext> {
    const context = await this.contextRepo.findOneOrFail({
      where: { id: contextId, tenantId },
    });

    context.sectionId = null;
    context.isLinked = false;

    return this.contextRepo.save(context);
  }

  async getUnlinkedContexts(tenantId: string): Promise<LtiContext[]> {
    return this.contextRepo.find({
      where: { tenantId, isLinked: false },
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================================
  // TOOL CONFIGURATION
  // ============================================================

  getToolConfiguration(): LtiToolConfiguration {
    const toolUrl = this.configService.get<string>('lti.toolUrl');
    const loginPath = this.configService.get<string>('lti.loginPath');
    const launchPath = this.configService.get<string>('lti.launchPath');
    const jwksPath = this.configService.get<string>('lti.jwksPath');
    const deepLinkPath = this.configService.get<string>('lti.deepLinkPath');

    return {
      issuer: toolUrl!,
      clientId: 'generated-during-registration',
      oidcLoginUrl: `${toolUrl}${loginPath}`,
      launchUrl: `${toolUrl}${launchPath}`,
      jwksUrl: `${toolUrl}${jwksPath}`,
      deepLinkUrl: `${toolUrl}${deepLinkPath}`,
      scopes: [
        'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
        'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
        'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
        'https://purl.imsglobal.org/spec/lti-ags/scope/score',
      ],
    };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  private async fetchPlatformJwks(
    jwksEndpoint: string,
  ): Promise<ReturnType<typeof jose.createLocalJWKSet>> {
    const response = await fetch(jwksEndpoint);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS from ${jwksEndpoint}`);
    }
    const jwks = (await response.json()) as jose.JSONWebKeySet;
    return jose.createLocalJWKSet(jwks);
  }

  /**
   * Clean up expired states (should be called periodically)
   */
  async cleanupExpiredStates(): Promise<number> {
    const result = await this.stateRepo
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }
}
