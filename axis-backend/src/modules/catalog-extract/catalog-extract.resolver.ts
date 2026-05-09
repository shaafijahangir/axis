import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from '../../database/entities';
import { UserRole } from '../../database/entities/user.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { CatalogExtractService } from './catalog-extract.service';
import { ExtractionResult } from './dto/extraction.types';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CatalogExtractResolver {
  constructor(private readonly catalogExtractService: CatalogExtractService) {}

  /**
   * Extract courses and programs from a base64-encoded document.
   *
   * The client encodes the file with FileReader.readAsDataURL() and strips
   * the data URL prefix, leaving only the base64 payload.
   *
   * Supported mimeTypes: application/pdf, text/plain
   */
  @Mutation(() => ExtractionResult)
  async extractCatalogFromDocument(
    @CurrentUser() user: User,
    @Args('fileBase64') fileBase64: string,
    @Args('mimeType') mimeType: string,
  ): Promise<ExtractionResult> {
    return this.catalogExtractService.extractFromDocument(
      user.tenantId,
      user.id,
      fileBase64,
      mimeType,
    );
  }
}
