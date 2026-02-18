import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { AiProvider } from '../ai/providers/ai-provider.interface';
import { AI_PROVIDER } from '../ai/providers/ai-provider.interface';
// pdf-parse v2 ships as CJS with a default export — use require() to sidestep
// ESM interop issues in NestJS's CommonJS transpilation target.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buf: Buffer,
) => Promise<{ text: string }>;
import { UsageTrackingService } from '../ai/usage-tracking.service';
import { CourseCategory } from '../../database/entities/course.entity';
import { DegreeProgramType } from '../../database/entities/degree-program.entity';
import {
  ExtractionResult,
  ExtractedCourse,
  ExtractedProgram,
  ExtractionFlag,
} from './dto/extraction.types';

/**
 * CatalogExtractService
 *
 * WHY: Institutions have academic catalogs as PDFs or text files. Manually
 * entering 200+ courses into the CRUD UI is impractical. This service uses
 * Claude to extract structured course/program data from unstructured documents,
 * enabling catalog setup in minutes instead of days.
 *
 * PATTERN: Single-shot extraction — one Claude call with a structured JSON
 * prompt, no tool use needed. Cheaper and faster than an agentic loop for
 * structured extraction tasks.
 *
 * TRADEOFF: Using Haiku for cost efficiency. Sonnet would be more accurate
 * on complex/poorly-formatted catalogs but 4× more expensive per document.
 */
@Injectable()
export class CatalogExtractService {
  private readonly logger = new Logger(CatalogExtractService.name);
  private readonly EXTRACTION_MODEL = 'claude-haiku-4-5-20251001';

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly usageTrackingService: UsageTrackingService,
  ) {}

  async extractFromDocument(
    tenantId: string,
    userId: string,
    fileBase64: string,
    mimeType: string,
  ): Promise<ExtractionResult> {
    // 1. Decode document and extract raw text
    const buffer = Buffer.from(fileBase64, 'base64');
    let documentText: string;

    if (mimeType === 'application/pdf') {
      try {
        const pdfData = await pdfParse(buffer);
        documentText = pdfData.text;
      } catch (err) {
        throw new BadRequestException(
          'Could not extract text from PDF. Try converting to plain text first.',
        );
      }
    } else {
      // Plain text / other text formats
      documentText = buffer.toString('utf-8');
    }

    if (!documentText.trim()) {
      return this.emptyResult(
        'No text content could be extracted from this document.',
      );
    }

    // Truncate extremely large documents to stay within context limits (~150K tokens)
    const MAX_CHARS = 500_000;
    if (documentText.length > MAX_CHARS) {
      this.logger.warn(
        `Document truncated from ${documentText.length} to ${MAX_CHARS} chars`,
      );
      documentText = documentText.slice(0, MAX_CHARS);
    }

    // 2. Send to Claude for structured extraction
    this.logger.log(
      `Extracting catalog from ${documentText.length} chars (mimeType: ${mimeType})`,
    );

    const response = await this.aiProvider.sendMessage({
      systemPrompt: this.buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: `Extract all courses and degree programs from this academic catalog:\n\n${documentText}`,
        },
      ],
      model: this.EXTRACTION_MODEL,
      maxTokens: 8192,
    });

    // 3. Log usage for cost tracking
    await this.usageTrackingService.logUsage({
      tenantId,
      userId,
      agentType: 'catalog-extractor',
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      model: response.model,
    });

    // 4. Parse JSON from response
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new BadRequestException(
        'AI extraction returned no content. Try again.',
      );
    }

    let rawJson: string = textBlock.text.trim();

    // Strip markdown code fences if the model wrapped the JSON
    if (rawJson.startsWith('```')) {
      rawJson = rawJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(rawJson) as Record<string, unknown>;
    } catch {
      this.logger.error(
        `Extraction JSON parse failed: ${rawJson.slice(0, 200)}`,
      );
      throw new BadRequestException(
        'AI returned unparseable output. The document may be too complex or poorly formatted.',
      );
    }

    // 5. Map raw JSON to typed result
    const estimatedCostUsd = this.aiProvider.estimateCost(
      response.usage.inputTokens,
      response.usage.outputTokens,
      response.model,
    );

    return this.mapExtractionResult(
      extracted,
      response.usage,
      estimatedCostUsd,
    );
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private emptyResult(flagMessage?: string): ExtractionResult {
    return {
      courses: [],
      programs: [],
      flags: flagMessage
        ? [
            {
              entityType: 'document',
              entityCode: '-',
              field: 'content',
              message: flagMessage,
            },
          ]
        : [],
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    };
  }

  private mapExtractionResult(
    raw: Record<string, unknown>,
    usage: { inputTokens: number; outputTokens: number },
    estimatedCostUsd: number,
  ): ExtractionResult {
    const flags: ExtractionFlag[] = ((raw.flags as unknown[]) ?? []).map(
      (f: unknown) => {
        const flag = f as Record<string, unknown>;
        return {
          entityType: String(flag.entityType ?? 'unknown'),
          entityCode: String(flag.entityCode ?? '-'),
          field: String(flag.field ?? 'unknown'),
          message: String(flag.message ?? ''),
        };
      },
    );

    const courses: ExtractedCourse[] = ((raw.courses as unknown[]) ?? []).map(
      (c: unknown) => {
        const course = c as Record<string, unknown>;
        const confidence = Math.min(
          1,
          Math.max(0, Number(course.confidence ?? 0.5)),
        );
        return {
          code: String(course.code ?? ''),
          title: String(course.title ?? ''),
          credits: course.credits != null ? Number(course.credits) : undefined,
          department: course.department ? String(course.department) : undefined,
          category:
            this.mapCategory(String(course.category ?? '')) ?? undefined,
          courseLevel: course.level != null ? Number(course.level) : undefined,
          description: course.description
            ? String(course.description)
            : undefined,
          offeredSemesters: Array.isArray(course.offeredSemesters)
            ? course.offeredSemesters.map(String)
            : [],
          prerequisiteCodes: Array.isArray(course.prerequisites)
            ? course.prerequisites.map(String)
            : [],
          corequisiteCodes: Array.isArray(course.corequisites)
            ? course.corequisites.map(String)
            : [],
          confidence,
          flagged: confidence < 0.75,
        };
      },
    );

    const programs: ExtractedProgram[] = (
      (raw.programs as unknown[]) ?? []
    ).map((p: unknown) => {
      const prog = p as Record<string, unknown>;
      const confidence = Math.min(
        1,
        Math.max(0, Number(prog.confidence ?? 0.5)),
      );
      return {
        name: String(prog.name ?? ''),
        code: String(prog.code ?? ''),
        programType: this.mapProgramType(String(prog.type ?? '')) ?? undefined,
        department: prog.department ? String(prog.department) : undefined,
        totalCreditsRequired:
          prog.totalCredits != null ? Number(prog.totalCredits) : undefined,
        expectedDurationSemesters:
          prog.durationSemesters != null
            ? Number(prog.durationSemesters)
            : undefined,
        confidence,
        flagged: confidence < 0.75,
      };
    });

    return {
      courses,
      programs,
      flags,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCostUsd,
    };
  }

  private mapCategory(raw: string): CourseCategory | null {
    const map: Record<string, CourseCategory> = {
      core: CourseCategory.CORE,
      elective: CourseCategory.ELECTIVE,
      general_education: CourseCategory.GENERAL_EDUCATION,
      'general education': CourseCategory.GENERAL_EDUCATION,
      lab: CourseCategory.LAB,
      seminar: CourseCategory.SEMINAR,
    };
    return map[raw.toLowerCase()] ?? null;
  }

  private mapProgramType(raw: string): DegreeProgramType | null {
    const map: Record<string, DegreeProgramType> = {
      major: DegreeProgramType.MAJOR,
      minor: DegreeProgramType.MINOR,
      certificate: DegreeProgramType.CERTIFICATE,
      diploma: DegreeProgramType.DIPLOMA,
    };
    return map[raw.toLowerCase()] ?? null;
  }

  private buildSystemPrompt(): string {
    return `You are a data extraction system for university academic catalog management.
Extract all course and degree program data from the provided catalog text.
Return ONLY a valid JSON object (no markdown, no code blocks, no explanation).

JSON structure:
{
  "courses": [
    {
      "code": "CS 101",
      "title": "Introduction to Computer Science",
      "credits": 3,
      "department": "Computer Science",
      "category": "core",
      "level": 100,
      "description": "One or two sentence course description.",
      "prerequisites": ["CS 100"],
      "corequisites": [],
      "offeredSemesters": ["FALL", "SPRING"],
      "confidence": 0.95
    }
  ],
  "programs": [
    {
      "name": "Bachelor of Science in Computer Science",
      "code": "BS-CS",
      "type": "major",
      "department": "Computer Science",
      "totalCredits": 120,
      "durationSemesters": 8,
      "confidence": 0.90
    }
  ],
  "flags": [
    {
      "entityType": "course",
      "entityCode": "CS 101",
      "field": "prerequisites",
      "message": "Prerequisite described in natural language; specific codes could not be determined"
    }
  ]
}

Field rules:
- code: Exact catalog number (e.g., "CS 101", "MATH 2301", "ENG 101A")
- category: One of: core, elective, general_education, lab, seminar
- level: Integer course level (100, 200, 300, 400 for undergrad; 500+ for graduate)
- offeredSemesters: Array of FALL, SPRING, SUMMER
- prerequisites / corequisites: Arrays of course CODE strings only — if described in
  natural language ("completion of freshman sequence"), extract what you can and add a flag
- confidence: Float 0.0–1.0; use < 0.75 when a field is ambiguous or uncertain
- program.type: One of: major, minor, certificate, diploma
- flags: Add one entry per ambiguous field so the admin knows what to review
- Omit fields that are not mentioned — do not guess or invent data
- Extract EVERY course found in the document, not just examples
- Return ONLY the JSON object — nothing before or after it`;
  }
}
