import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model } from 'mongoose';
import { Types } from 'mongoose';
import type { GenerateNumberOptions, GeneratedNumber } from './dto/generate-number.dto';
import type { NumberFormatConfig } from './numbering.constants';
import { NUMBER_FORMATS, NumberEntityType } from './numbering.constants';
import { Counter } from './schemas/counter.schema';

@Injectable()
export class NumberingService {
  constructor(
    @InjectModel(Counter.name)
    private readonly counterModel: Model<Counter>,
  ) {}

  /**
   * Atomically allocate the next human-readable code for an entity type.
   * Uses $inc on the counters collection — never document counts.
   */
  async next(
    entityType: NumberEntityType,
    options: GenerateNumberOptions = {},
    session?: ClientSession,
  ): Promise<GeneratedNumber> {
    const format = this.getFormat(entityType);
    const financialYear = this.resolveFinancialYear(format, options);
    const projectId = this.resolveProjectId(format, options);
    const scopeKey = this.buildScopeKey(entityType, financialYear, projectId);

    const query = this.counterModel.findOneAndUpdate(
      { scopeKey },
      {
        $inc: { seq: 1 },
        $setOnInsert: {
          scopeKey,
          entityType,
          prefix: format.prefix,
          financialYear,
          projectId,
          padLength: format.padLength,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    if (session) {
      query.session(session);
    }

    const counter = await query.exec();

    if (!counter) {
      throw new BadRequestException(`Failed to allocate number for ${entityType}`);
    }

    const code = this.formatCode(format.prefix, counter.seq, format.padLength, financialYear);

    return {
      code,
      sequence: counter.seq,
      prefix: format.prefix,
      financialYear,
      projectId: projectId ? String(projectId) : null,
      scopeKey,
      entityType,
    };
  }

  /** Convenience: return only the formatted code string. */
  async nextCode(
    entityType: NumberEntityType,
    options: GenerateNumberOptions = {},
    session?: ClientSession,
  ): Promise<string> {
    const result = await this.next(entityType, options, session);
    return result.code;
  }

  /**
   * Allocate multiple codes atomically in sequence (still $inc-based, not counts).
   */
  async nextMany(
    entityType: NumberEntityType,
    count: number,
    options: GenerateNumberOptions = {},
    session?: ClientSession,
  ): Promise<GeneratedNumber[]> {
    if (!Number.isInteger(count) || count < 1) {
      throw new BadRequestException('count must be a positive integer');
    }

    const results: GeneratedNumber[] = [];
    for (let i = 0; i < count; i += 1) {
      results.push(await this.next(entityType, options, session));
    }
    return results;
  }

  /**
   * Peek at the last issued sequence without incrementing.
   * Returns null if no counter exists yet for the scope.
   */
  async peek(
    entityType: NumberEntityType,
    options: GenerateNumberOptions = {},
  ): Promise<GeneratedNumber | null> {
    const format = this.getFormat(entityType);
    const financialYear = this.resolveFinancialYear(format, options);
    const projectId = this.resolveProjectId(format, options);
    const scopeKey = this.buildScopeKey(entityType, financialYear, projectId);

    const counter = await this.counterModel.findOne({ scopeKey }).exec();
    if (!counter || counter.seq < 1) {
      return null;
    }

    return {
      code: this.formatCode(format.prefix, counter.seq, format.padLength, financialYear),
      sequence: counter.seq,
      prefix: format.prefix,
      financialYear,
      projectId: projectId ? String(projectId) : null,
      scopeKey,
      entityType,
    };
  }

  formatCode(
    prefix: string,
    sequence: number,
    padLength: number,
    financialYear: string | null,
  ): string {
    const padded = String(sequence).padStart(padLength, '0');
    if (financialYear) {
      return `${prefix}-${financialYear}-${padded}`;
    }
    return `${prefix}-${padded}`;
  }

  buildScopeKey(
    entityType: NumberEntityType,
    financialYear: string | null,
    projectId: Types.ObjectId | null,
  ): string {
    const yearPart = financialYear ?? 'GLOBAL';
    const projectPart = projectId ? String(projectId) : 'GLOBAL';
    return `${entityType}:${yearPart}:${projectPart}`;
  }

  /**
   * Resolves a 4-digit year for FY-based codes.
   * Default: calendar year of `asOf` (or now). Override with options.financialYear.
   */
  resolveFinancialYear(format: NumberFormatConfig, options: GenerateNumberOptions): string | null {
    if (!format.useFinancialYear) {
      return null;
    }

    if (options.financialYear) {
      const year = options.financialYear.trim();
      if (!/^\d{4}$/.test(year)) {
        throw new BadRequestException('financialYear must be a 4-digit year, e.g. 2026');
      }
      return year;
    }

    const asOf = options.asOf ?? new Date();
    return String(asOf.getUTCFullYear());
  }

  getFormat(entityType: NumberEntityType): NumberFormatConfig {
    const format = NUMBER_FORMATS[entityType];
    if (!format) {
      throw new BadRequestException(`Unsupported entity type for numbering: ${entityType}`);
    }
    return format;
  }

  private resolveProjectId(
    format: NumberFormatConfig,
    options: GenerateNumberOptions,
  ): Types.ObjectId | null {
    const wantsProjectScope = Boolean(options.projectScoped || options.projectId);

    if (!wantsProjectScope) {
      return null;
    }

    if (!format.allowProjectScope) {
      throw new BadRequestException(
        `Entity does not support project-specific numbering`,
      );
    }

    if (!options.projectId) {
      throw new BadRequestException('projectId is required for project-scoped numbering');
    }

    if (!Types.ObjectId.isValid(options.projectId)) {
      throw new BadRequestException('projectId must be a valid ObjectId');
    }

    return new Types.ObjectId(options.projectId);
  }
}
