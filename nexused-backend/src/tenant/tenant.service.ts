import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Tenant,
  SubscriptionPlan,
  BillingStatus,
} from '../database/entities/tenant.entity';
import {
  EnrollmentPolicy,
  UpdateEnrollmentPolicyInput,
  DEFAULT_ENROLLMENT_POLICY,
} from './enrollment-policy.types';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async create(input: {
    name: string;
    domain: string;
    subdomain: string;
    subscriptionPlan?: SubscriptionPlan;
    billingStatus?: BillingStatus;
    settings?: Record<string, any>;
  }): Promise<Tenant> {
    const tenant = this.tenantRepository.create({
      name: input.name,
      domain: input.domain,
      subdomain: input.subdomain,
      subscriptionPlan: input.subscriptionPlan || SubscriptionPlan.FREE,
      billingStatus: input.billingStatus || BillingStatus.ACTIVE,
      settings: input.settings || {},
    });

    return await this.tenantRepository.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return await this.tenantRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Tenant | null> {
    return await this.tenantRepository.findOne({ where: { id } });
  }

  async count(): Promise<number> {
    return await this.tenantRepository.count();
  }

  /**
   * Returns the enrollment policy for a tenant, filling in defaults for
   * any missing fields.
   *
   * WHY defaults: New tenants start with no policy configured.
   * Rather than forcing an initial setup, we return sensible defaults
   * so the system is immediately functional.
   */
  async getEnrollmentPolicy(tenantId: string): Promise<EnrollmentPolicy> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const stored = (tenant.settings?.enrollmentPolicy ??
      {}) as Partial<EnrollmentPolicy>;
    return {
      ...DEFAULT_ENROLLMENT_POLICY,
      ...stored,
    };
  }

  /**
   * Merges the given policy fields into the tenant's settings JSONB.
   *
   * PATTERN: Partial update — only the provided fields are written.
   * Fields not present in the input retain their stored (or default) value.
   */
  async updateEnrollmentPolicy(
    tenantId: string,
    input: UpdateEnrollmentPolicyInput,
  ): Promise<EnrollmentPolicy> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const current: EnrollmentPolicy = {
      ...DEFAULT_ENROLLMENT_POLICY,
      ...((tenant.settings?.enrollmentPolicy ??
        {}) as Partial<EnrollmentPolicy>),
    };

    const updated: EnrollmentPolicy = {
      prerequisiteEnforcement:
        input.prerequisiteEnforcement ?? current.prerequisiteEnforcement,
      creditHourLimitPerTerm:
        input.creditHourLimitPerTerm !== undefined
          ? input.creditHourLimitPerTerm
          : current.creditHourLimitPerTerm,
      enrollmentWindowStart:
        input.enrollmentWindowStart !== undefined
          ? input.enrollmentWindowStart
          : current.enrollmentWindowStart,
      enrollmentWindowEnd:
        input.enrollmentWindowEnd !== undefined
          ? input.enrollmentWindowEnd
          : current.enrollmentWindowEnd,
      waitlistEnabled:
        input.waitlistEnabled !== undefined
          ? input.waitlistEnabled
          : current.waitlistEnabled,
      waitlistMaxSize:
        input.waitlistMaxSize !== undefined
          ? input.waitlistMaxSize
          : current.waitlistMaxSize,
      waitlistAutoPromote:
        input.waitlistAutoPromote !== undefined
          ? input.waitlistAutoPromote
          : current.waitlistAutoPromote,
      waitlistConfirmationHours:
        input.waitlistConfirmationHours !== undefined
          ? input.waitlistConfirmationHours
          : current.waitlistConfirmationHours,
    };

    tenant.settings = {
      ...(tenant.settings ?? {}),
      enrollmentPolicy: updated,
    };

    await this.tenantRepository.save(tenant);
    return updated;
  }
}
