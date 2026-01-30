import { Resolver, Query, Mutation, Args, InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TenantService } from './tenant.service';
import { Tenant, SubscriptionPlan, BillingStatus } from '../database/entities/tenant.entity';

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
  constructor(private readonly tenantService: TenantService) { }

  @Mutation(() => Tenant)
  async createTenant(
    @Args('input') input: CreateTenantInput,
  ): Promise<Tenant> {
    const settings = input.settings ? JSON.parse(input.settings) : {};
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
  async tenants(): Promise<Tenant[]> {
    return await this.tenantService.findAll();
  }

  @Query(() => Tenant, { nullable: true })
  async tenant(@Args('id') id: string): Promise<Tenant | null> {
    return await this.tenantService.findOne(id);
  }

  @Query(() => Number)
  async tenantCount(): Promise<number> {
    return await this.tenantService.count();
  }
}
