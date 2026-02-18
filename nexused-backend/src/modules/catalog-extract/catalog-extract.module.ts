import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CatalogExtractService } from './catalog-extract.service';
import { CatalogExtractResolver } from './catalog-extract.resolver';

/**
 * CatalogExtractModule
 *
 * WHY separate module: CatalogExtractService needs AiModule (for AI_PROVIDER
 * and UsageTrackingService). CoursesModule also imports AiModule for AI tools.
 * Putting extraction in CoursesModule would not create a circular dep here, but
 * keeping it separate cleanly scopes the AI dependency and makes the feature
 * independently deletable if we ever want to strip it.
 *
 * PATTERN: Feature module — one module per vertical slice of functionality.
 */
@Module({
  imports: [AiModule],
  providers: [CatalogExtractService, CatalogExtractResolver],
})
export class CatalogExtractModule {}
