import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import type {
  CreateGstDocumentDto,
  CreateGstReturnDto,
  FileGstReturnDto,
  GstRegisterQueryDto,
  ListGstDocumentsQueryDto,
  ListGstReturnsQueryDto,
  SyncGstDocumentFromSourceDto,
} from './dto/gst.dto';
import {
  toGstRegisterRow,
  toPublicGstDocument,
  toPublicGstReturn,
} from './gst.mapper';
import {
  GstDirection,
  GstDocument,
  GstDocumentStatus,
  GstDocumentType,
  GstPartyType,
  GstSupplyType,
} from './schemas/gst-document.schema';
import { GstReturn, GstReturnStatus } from './schemas/gst-return.schema';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class GstService {
  constructor(
    @InjectModel(GstDocument.name)
    private readonly documentModel: Model<GstDocument>,
    @InjectModel(GstReturn.name)
    private readonly returnModel: Model<GstReturn>,
  ) {}

  async createDocument(dto: CreateGstDocumentDto, actorId: string) {
    const cgst = roundMoney(dto.cgst ?? 0);
    const sgst = roundMoney(dto.sgst ?? 0);
    const igst = roundMoney(dto.igst ?? 0);
    const cess = roundMoney(dto.cess ?? 0);
    const taxableValue = roundMoney(dto.taxableValue);
    const totalValue =
      dto.totalValue !== undefined
        ? roundMoney(dto.totalValue)
        : roundMoney(taxableValue + cgst + sgst + igst + cess);

    const status = dto.status ?? GstDocumentStatus.Posted;
    if (
      status !== GstDocumentStatus.Draft &&
      status !== GstDocumentStatus.Posted
    ) {
      throw new BadRequestException('Documents can only be created as draft or posted');
    }

    const documentNumber = await this.nextDocumentNumber(dto.companyId);
    const row = await this.documentModel.create({
      documentNumber,
      companyId: new Types.ObjectId(dto.companyId),
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      documentType: dto.documentType,
      direction: dto.direction,
      partyType: dto.partyType,
      partyId: dto.partyId ? new Types.ObjectId(dto.partyId) : null,
      partyGstin: dto.partyGstin?.trim().toUpperCase() ?? null,
      partyName: dto.partyName.trim(),
      documentDate: new Date(dto.documentDate),
      supplyType: dto.supplyType,
      taxableValue,
      cgst,
      sgst,
      igst,
      cess,
      totalValue,
      hsnSac: dto.hsnSac?.trim() ?? null,
      placeOfSupply: dto.placeOfSupply?.trim() ?? null,
      sourceModule: dto.sourceModule?.trim() ?? null,
      sourceEntityType: dto.sourceEntityType?.trim() ?? null,
      sourceEntityId: dto.sourceEntityId?.trim() ?? null,
      status,
      journalEntryId: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicGstDocument(row),
      'GST document registered',
    );
  }

  async syncFromSource(dto: SyncGstDocumentFromSourceDto, actorId: string) {
    const sourceModule = dto.sourceModule.trim();
    const sourceEntityId = dto.sourceEntityId.trim();

    const existing = await this.documentModel
      .findOne({ sourceModule, sourceEntityId })
      .exec();

    if (existing) {
      return createSuccessResponse(
        toPublicGstDocument(existing),
        'GST document synced (existing)',
      );
    }

    const documentNumber = await this.nextDocumentNumber(dto.companyId);
    const row = await this.documentModel.create({
      documentNumber,
      companyId: new Types.ObjectId(dto.companyId),
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      documentType: GstDocumentType.TaxInvoice,
      direction: GstDirection.Outward,
      partyType: GstPartyType.Other,
      partyId: null,
      partyGstin: null,
      partyName: `Synced ${sourceModule}`,
      documentDate: new Date(),
      supplyType: GstSupplyType.Intra,
      taxableValue: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
      totalValue: 0,
      hsnSac: null,
      placeOfSupply: null,
      sourceModule,
      sourceEntityType: dto.sourceEntityType?.trim() ?? null,
      sourceEntityId,
      status: GstDocumentStatus.Draft,
      journalEntryId: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicGstDocument(row),
      'GST document synced (stub created)',
    );
  }

  async listDocuments(query: ListGstDocumentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = this.buildDocumentFilter(query);
    const sortField = query.sortBy ?? 'documentDate';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.documentModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.documentModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicGstDocument(row)),
      'GST documents fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getDocumentById(id: string) {
    const row = await this.requireDocument(id);
    return createSuccessResponse(
      toPublicGstDocument(row),
      'GST document fetched',
    );
  }

  async cancelDocument(id: string, actorId: string) {
    const row = await this.requireDocument(id);
    if (row.status === GstDocumentStatus.Cancelled) {
      throw new BadRequestException('Document is already cancelled');
    }
    row.status = GstDocumentStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicGstDocument(row),
      'GST document cancelled',
    );
  }

  async register(query: GstRegisterQueryDto) {
    const filter: FilterQuery<GstDocument> = {
      companyId: new Types.ObjectId(query.companyId),
      direction: query.direction,
      status: GstDocumentStatus.Posted,
      documentDate: {
        $gte: new Date(query.from),
        $lte: new Date(query.to),
      },
    };
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }

    const rows = await this.documentModel
      .find(filter)
      .sort({ documentDate: 1, documentNumber: 1 })
      .exec();

    const data = rows.map((row) => toGstRegisterRow(row));
    const totals = data.reduce(
      (acc, row) => ({
        taxableValue: roundMoney(acc.taxableValue + row.taxableValue),
        cgst: roundMoney(acc.cgst + row.cgst),
        sgst: roundMoney(acc.sgst + row.sgst),
        igst: roundMoney(acc.igst + row.igst),
        cess: roundMoney(acc.cess + row.cess),
        totalValue: roundMoney(acc.totalValue + row.totalValue),
      }),
      {
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        cess: 0,
        totalValue: 0,
      },
    );

    return createSuccessResponse(
      { direction: query.direction, rows: data, totals },
      'GST register fetched',
    );
  }

  async createReturn(dto: CreateGstReturnDto, actorId: string) {
    const returnNumber = await this.nextReturnNumber(
      dto.companyId,
      dto.returnType,
      dto.periodYear,
      dto.periodMonth,
    );

    const row = await this.returnModel.create({
      returnNumber,
      companyId: new Types.ObjectId(dto.companyId),
      returnType: dto.returnType,
      periodMonth: dto.periodMonth,
      periodYear: dto.periodYear,
      status: GstReturnStatus.Draft,
      taxableOutward: 0,
      cgstOutward: 0,
      sgstOutward: 0,
      igstOutward: 0,
      taxableInward: 0,
      cgstInward: 0,
      sgstInward: 0,
      igstInward: 0,
      itcAvailable: 0,
      taxPayable: 0,
      filedAt: null,
      acknowledgementNumber: null,
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(toPublicGstReturn(row), 'GST return created');
  }

  async listReturns(query: ListGstReturnsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<GstReturn> = {};
    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.returnType) filter.returnType = query.returnType;
    if (query.periodMonth) filter.periodMonth = query.periodMonth;
    if (query.periodYear) filter.periodYear = query.periodYear;

    const sortField = query.sortBy ?? 'createdAt';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.returnModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.returnModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicGstReturn(row)),
      'GST returns fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getReturnById(id: string) {
    const row = await this.requireReturn(id);
    return createSuccessResponse(toPublicGstReturn(row), 'GST return fetched');
  }

  async computeReturn(id: string, actorId: string) {
    const row = await this.requireReturn(id);
    if (
      row.status !== GstReturnStatus.Draft &&
      row.status !== GstReturnStatus.Computed
    ) {
      throw new BadRequestException(
        'Only draft or computed returns can be recomputed',
      );
    }

    const { start, end } = this.periodBounds(row.periodYear, row.periodMonth);
    const docs = await this.documentModel
      .find({
        companyId: row.companyId,
        status: GstDocumentStatus.Posted,
        documentDate: { $gte: start, $lte: end },
      })
      .lean()
      .exec();

    let taxableOutward = 0;
    let cgstOutward = 0;
    let sgstOutward = 0;
    let igstOutward = 0;
    let taxableInward = 0;
    let cgstInward = 0;
    let sgstInward = 0;
    let igstInward = 0;

    for (const doc of docs) {
      if (doc.direction === GstDirection.Outward) {
        taxableOutward += doc.taxableValue;
        cgstOutward += doc.cgst;
        sgstOutward += doc.sgst;
        igstOutward += doc.igst;
      } else {
        taxableInward += doc.taxableValue;
        cgstInward += doc.cgst;
        sgstInward += doc.sgst;
        igstInward += doc.igst;
      }
    }

    const itcAvailable = roundMoney(cgstInward + sgstInward + igstInward);
    const outwardTax = roundMoney(cgstOutward + sgstOutward + igstOutward);
    const taxPayable = roundMoney(Math.max(0, outwardTax - itcAvailable));

    row.taxableOutward = roundMoney(taxableOutward);
    row.cgstOutward = roundMoney(cgstOutward);
    row.sgstOutward = roundMoney(sgstOutward);
    row.igstOutward = roundMoney(igstOutward);
    row.taxableInward = roundMoney(taxableInward);
    row.cgstInward = roundMoney(cgstInward);
    row.sgstInward = roundMoney(sgstInward);
    row.igstInward = roundMoney(igstInward);
    row.itcAvailable = itcAvailable;
    row.taxPayable = taxPayable;
    row.status = GstReturnStatus.Computed;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicGstReturn(row),
      'GST return computed from posted documents',
    );
  }

  async fileReturn(id: string, dto: FileGstReturnDto, actorId: string) {
    const row = await this.requireReturn(id);
    if (row.status !== GstReturnStatus.Computed) {
      throw new BadRequestException('Only computed returns can be filed');
    }

    row.status = GstReturnStatus.Filed;
    row.filedAt = new Date();
    row.acknowledgementNumber =
      dto.acknowledgementNumber?.trim() ??
      `ACK-GST-${row.returnNumber}-${Date.now()}`;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(toPublicGstReturn(row), 'GST return filed');
  }

  async cancelReturn(id: string, actorId: string) {
    const row = await this.requireReturn(id);
    if (row.status === GstReturnStatus.Filed) {
      throw new BadRequestException('Filed returns cannot be cancelled');
    }
    if (row.status === GstReturnStatus.Cancelled) {
      throw new BadRequestException('Return is already cancelled');
    }

    row.status = GstReturnStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(toPublicGstReturn(row), 'GST return cancelled');
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private buildDocumentFilter(
    query: ListGstDocumentsQueryDto,
  ): FilterQuery<GstDocument> {
    const filter: FilterQuery<GstDocument> = {};
    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.direction) filter.direction = query.direction;
    if (query.status) filter.status = query.status;
    if (query.documentType) filter.documentType = query.documentType;
    if (query.from || query.to) {
      filter.documentDate = {};
      if (query.from) {
        filter.documentDate.$gte = new Date(query.from);
      }
      if (query.to) {
        filter.documentDate.$lte = new Date(query.to);
      }
    }
    return filter;
  }

  private periodBounds(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    return { start, end };
  }

  private async nextDocumentNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.documentModel
      .countDocuments({ companyId: new Types.ObjectId(companyId) })
      .setOptions({ withDeleted: true })
      .exec();
    return `GST-DOC-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async nextReturnNumber(
    companyId: string,
    returnType: string,
    periodYear: number,
    periodMonth: number,
  ): Promise<string> {
    const count = await this.returnModel
      .countDocuments({
        companyId: new Types.ObjectId(companyId),
        returnType,
        periodYear,
        periodMonth,
      })
      .setOptions({ withDeleted: true })
      .exec();
    const period = `${periodYear}${String(periodMonth).padStart(2, '0')}`;
    return `GST-${returnType.toUpperCase()}-${period}-${String(count + 1).padStart(3, '0')}`;
  }

  private async requireDocument(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid GST document id');
    }
    const row = await this.documentModel.findById(id).exec();
    if (!row) throw new NotFoundException('GST document not found');
    return row;
  }

  private async requireReturn(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid GST return id');
    }
    const row = await this.returnModel.findById(id).exec();
    if (!row) throw new NotFoundException('GST return not found');
    return row;
  }
}
