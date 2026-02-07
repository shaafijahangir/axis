import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Tenant,
  SubscriptionPlan,
  BillingStatus,
} from '../database/entities/tenant.entity';

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
}
