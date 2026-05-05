import {
  ObjectType,
  Field,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';
import { LtiPlatformStatus } from '../entities/lti-platform.entity';

/**
 * LTI Message Types
 */
export enum LtiMessageType {
  RESOURCE_LINK = 'LtiResourceLinkRequest',
  DEEP_LINKING = 'LtiDeepLinkingRequest',
}

registerEnumType(LtiMessageType, {
  name: 'LtiMessageType',
  description: 'Types of LTI launch messages',
});

/**
 * Input for creating/registering a new LTI platform
 */
@InputType()
export class CreateLtiPlatformInput {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsUrl()
  issuer: string;

  @Field()
  @IsString()
  clientId: string;

  @Field()
  @IsUrl()
  authorizationEndpoint: string;

  @Field()
  @IsUrl()
  tokenEndpoint: string;

  @Field()
  @IsUrl()
  jwksEndpoint: string;
}

/**
 * Input for updating an LTI platform
 */
@InputType()
export class UpdateLtiPlatformInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  authorizationEndpoint?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  tokenEndpoint?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  jwksEndpoint?: string;

  @Field(() => LtiPlatformStatus, { nullable: true })
  @IsOptional()
  @IsEnum(LtiPlatformStatus)
  status?: LtiPlatformStatus;
}

/**
 * Input for creating a deployment
 */
@InputType()
export class CreateLtiDeploymentInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  platformId: string;

  @Field()
  @IsString()
  deploymentId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  label?: string;
}

/**
 * Input for linking an LTI context to a NexusEd section
 */
@InputType()
export class LinkLtiContextInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  contextId: string;

  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  sectionId: string;
}

/**
 * Tool configuration for registration
 */
@ObjectType()
export class LtiToolConfiguration {
  @Field()
  issuer: string;

  @Field()
  clientId: string;

  @Field()
  oidcLoginUrl: string;

  @Field()
  launchUrl: string;

  @Field()
  jwksUrl: string;

  @Field({ nullable: true })
  deepLinkUrl?: string;

  @Field(() => [String])
  scopes: string[];
}

/**
 * Platform registration info (for admin display)
 */
@ObjectType()
export class LtiPlatformInfo {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  issuer: string;

  @Field()
  clientId: string;

  @Field(() => LtiPlatformStatus)
  status: LtiPlatformStatus;

  @Field()
  deploymentCount: number;

  @Field()
  userCount: number;

  @Field()
  createdAt: Date;
}

/**
 * LTI launch session info (returned after successful launch)
 */
@ObjectType()
export class LtiLaunchSession {
  @Field()
  success: boolean;

  @Field()
  userId: string;

  @Field({ nullable: true })
  sectionId?: string;

  @Field({ nullable: true })
  contextTitle?: string;

  @Field()
  redirectUrl: string;
}

/**
 * Input for admin to enable/disable LTI services
 */
@InputType()
export class UpdateLtiServicesInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  deploymentId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  nrpsEnabled?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  agsEnabled?: boolean;
}

/**
 * JWKS public key format
 */
@ObjectType()
export class JwkKey {
  @Field()
  kty: string;

  @Field()
  kid: string;

  @Field()
  use: string;

  @Field()
  alg: string;

  @Field()
  n: string;

  @Field()
  e: string;
}

@ObjectType()
export class JwksResponse {
  @Field(() => [JwkKey])
  keys: JwkKey[];
}
