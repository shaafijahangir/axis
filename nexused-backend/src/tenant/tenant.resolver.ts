import {
  Resolver,
  Query,
  Mutation,
  Args,
  InputType,
  Field,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { TenantService } from './tenant.service';
import {
  Tenant,
  SubscriptionPlan,
  BillingStatus,
} from '../database/entities/tenant.entity';
import { UserRole } from '../database/entities/user.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import {
  EnrollmentPolicy,
  UpdateEnrollmentPolicyInput,
} from './enrollment-policy.types';

@InputType()
export class CreateTenantInput {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsString()
  domain: string;

  @Field()
  @IsString()
  subdomain: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  subscriptionPlan?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  billingStatus?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  settings?: string;
}

@Resolver(() => Tenant)
export class TenantResolver {
  constructor(private readonly tenantService: TenantService) {}

  @Mutation(() => Tenant)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createTenant(@Args('input') input: CreateTenantInput): Promise<Tenant> {
    const settings = input.settings
      ? (JSON.parse(input.settings) as Record<string, unknown>)
      : {};
    return await this.tenantService.create({
      name: input.name,
      domain: input.domain,
      subdomain: input.subdomain,
      subscriptionPlan: input.subscriptionPlan as SubscriptionPlan,
      billingStatus: input.billingStatus as BillingStatus,
      settings,
    });
  }

  @Query(() => [Tenant])
  @UseGuards(JwtAuthGuard)
  async tenants(): Promise<Tenant[]> {
    return await this.tenantService.findAll();
  }

  @Query(() => Tenant, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async tenant(@Args('id') id: string): Promise<Tenant | null> {
    return await this.tenantService.findOne(id);
  }

  @Query(() => Number)
  @UseGuards(JwtAuthGuard)
  async tenantCount(): Promise<number> {
    return await this.tenantService.count();
  }

  // ─── Enrollment Policy ────────────────────────────────────────────────

  @Query(() => EnrollmentPolicy)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async enrollmentPolicy(@CurrentUser() user: User): Promise<EnrollmentPolicy> {
    return this.tenantService.getEnrollmentPolicy(user.tenantId);
  }

  @Mutation(() => EnrollmentPolicy)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateEnrollmentPolicy(
    @CurrentUser() user: User,
    @Args('input') input: UpdateEnrollmentPolicyInput,
  ): Promise<EnrollmentPolicy> {
    return this.tenantService.updateEnrollmentPolicy(user.tenantId, input);
  }
}
