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
import { normalizeOptionalCode } from '../company/company.validation';
import { Company } from '../company/schemas/company.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { User } from '../users/schemas/user.schema';
import type { CreateDirectorDto } from './dto/create-director.dto';
import type { UpdateDirectorDto } from './dto/update-director.dto';
import {
  type PublicDirectorDocument,
  toPublicDirector,
} from './directors.mapper';
import {
  DirectorDocumentCategory,
  DirectorFile,
} from './schemas/director-document.schema';
import { Director, DirectorStatus } from './schemas/director.schema';

@Injectable()
export class DirectorsService {
  constructor(
    @InjectModel(Director.name) private readonly directorModel: Model<Director>,
    @InjectModel(DirectorFile.name) private readonly documentModel: Model<DirectorFile>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    private readonly numberingService: NumberingService,
  ) {}

  async create(dto: CreateDirectorDto, actorId?: string) {
    if (!dto.userId?.trim()) {
      throw new BadRequestException('Linked user is required for every director');
    }
    await this.assertUserAvailable(dto.userId);
    const companyId = await this.resolveCompanyId(dto.companyId);
    const directorCode = await this.numberingService.nextCode(NumberEntityType.DIRECTOR);

    const director = await this.directorModel.create({
      companyId,
      directorCode,
      userId: new Types.ObjectId(dto.userId),
      fullName: dto.fullName.trim(),
      din: normalizeOptionalCode(dto.din ?? null),
      pan: normalizeOptionalCode(dto.pan ?? null),
      email: dto.email?.trim().toLowerCase() ?? null,
      phone: dto.phone?.trim() ?? null,
      address: dto.address?.trim() ?? null,
      appointmentDate: dto.appointmentDate ? new Date(dto.appointmentDate) : null,
      status: dto.status ?? DirectorStatus.Active,
      isPlaceholder: false,
      createdBy: actorId ? new Types.ObjectId(actorId) : null,
    });

    return createSuccessResponse(
      await this.toEnrichedPublicDirector(director),
      'Director created successfully',
    );
  }

  async update(id: string, dto: UpdateDirectorDto, actorId?: string) {
    await this.requireDirector(id);
    if (dto.userId !== undefined) {
      if (!dto.userId?.trim()) {
        throw new BadRequestException('Linked user is required for every director');
      }
      await this.assertUserAvailable(dto.userId, id);
    }

    const update: Record<string, unknown> = {
      updatedBy: actorId ? new Types.ObjectId(actorId) : null,
    };
    if (dto.fullName !== undefined) update.fullName = dto.fullName.trim();
    if (dto.userId !== undefined) {
      update.userId = new Types.ObjectId(dto.userId);
    }
    if (dto.din !== undefined) update.din = normalizeOptionalCode(dto.din);
    if (dto.pan !== undefined) update.pan = normalizeOptionalCode(dto.pan);
    if (dto.email !== undefined) {
      update.email = dto.email ? dto.email.trim().toLowerCase() : null;
    }
    if (dto.phone !== undefined) update.phone = dto.phone?.trim() ?? null;
    if (dto.address !== undefined) update.address = dto.address?.trim() ?? null;
    if (dto.appointmentDate !== undefined) {
      update.appointmentDate = dto.appointmentDate ? new Date(dto.appointmentDate) : null;
    }
    if (dto.status !== undefined) update.status = dto.status;

    const updated = await this.directorModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();

    return createSuccessResponse(
      await this.toEnrichedPublicDirector(updated!),
      'Director updated successfully',
    );
  }

  async getById(id: string) {
    const director = await this.requireDirector(id);
    return createSuccessResponse(
      await this.toEnrichedPublicDirector(director),
      'Director fetched successfully',
    );
  }

  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: DirectorStatus;
    companyId?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const filter: FilterQuery<Director> = {};
    if (query.status) filter.status = query.status;
    if (query.companyId) filter.companyId = new Types.ObjectId(query.companyId);
    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { directorCode: { $regex: search, $options: 'i' } },
        { din: { $regex: search, $options: 'i' } },
        { pan: { $regex: search, $options: 'i' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.directorModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.directorModel.countDocuments(filter).exec(),
    ]);

    const enriched = await this.enrichPublicDirectors(items);
    return createSuccessResponse(
      enriched,
      'Directors fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async addDocument(
    id: string,
    input: {
      fileName: string;
      filePath: string;
      mimeType: string | null;
      sizeBytes: number;
      category?: DirectorDocumentCategory;
    },
    actorId: string,
  ) {
    await this.requireDirector(id);
    const doc = await this.documentModel.create({
      directorId: new Types.ObjectId(id),
      fileName: input.fileName,
      filePath: input.filePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      category: input.category ?? DirectorDocumentCategory.General,
      uploadedBy: new Types.ObjectId(actorId),
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      this.toPublicDocument(doc),
      'Director document uploaded successfully',
    );
  }

  async listDocuments(id: string, query: { page?: number; limit?: number }) {
    await this.requireDirector(id);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = { directorId: new Types.ObjectId(id) };

    const [items, total] = await Promise.all([
      this.documentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.documentModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => this.toPublicDocument(item)),
      'Director documents fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async requireDirector(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid director id');
    }
    const director = await this.directorModel.findById(id).exec();
    if (!director) {
      throw new NotFoundException('Director not found');
    }
    return director;
  }

  private async toEnrichedPublicDirector(director: {
    _id: Types.ObjectId;
    companyId?: Types.ObjectId | null;
    directorCode: string;
    userId?: Types.ObjectId | null;
    fullName: string;
    din?: string | null;
    pan?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    appointmentDate?: Date | null;
    status: DirectorStatus;
    isPlaceholder?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const [enriched] = await this.enrichPublicDirectors([director]);
    return enriched!;
  }

  private async enrichPublicDirectors(
    directors: Array<{
      _id: Types.ObjectId;
      companyId?: Types.ObjectId | null;
      directorCode: string;
      userId?: Types.ObjectId | null;
      fullName: string;
      din?: string | null;
      pan?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      appointmentDate?: Date | null;
      status: DirectorStatus;
      isPlaceholder?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    }>,
  ) {
    const userIds = directors
      .map((d) => d.userId)
      .filter((id): id is Types.ObjectId => Boolean(id));
    const users = userIds.length
      ? await this.userModel
          .find({ _id: { $in: userIds } })
          .select('_id userCode employeeId')
          .lean()
          .exec()
      : [];
    const byId = new Map(
      users.map((u) => [
        String(u._id),
        {
          userCode: u.userCode ?? null,
          employeeId: u.employeeId ?? null,
        },
      ]),
    );
    return directors.map((director) =>
      toPublicDirector(
        director,
        director.userId ? byId.get(String(director.userId)) : null,
      ),
    );
  }

  private async assertUserAvailable(
    userId: string,
    excludeDirectorId?: string,
  ) {
    const user = await this.userModel.findById(userId).select('_id').lean().exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const filter: FilterQuery<Director> = {
      userId: new Types.ObjectId(userId),
    };
    if (excludeDirectorId) {
      filter._id = { $ne: new Types.ObjectId(excludeDirectorId) };
    }
    const linked = await this.directorModel.findOne(filter).select('_id').lean().exec();
    if (linked) {
      throw new BadRequestException(
        'This user is already linked to another director',
      );
    }
  }

  private async resolveCompanyId(
    companyId?: string | null,
  ): Promise<Types.ObjectId | null> {
    if (companyId) {
      const company = await this.companyModel.findById(companyId).select('_id').lean().exec();
      if (!company) {
        throw new NotFoundException('Company not found');
      }
      return company._id as Types.ObjectId;
    }
    const primary = await this.companyModel
      .findOne({ isPrimary: true })
      .select('_id')
      .lean()
      .exec();
    return primary?._id ? (primary._id as Types.ObjectId) : null;
  }

  private toPublicDocument(doc: {
    _id: Types.ObjectId;
    directorId: Types.ObjectId;
    fileName: string;
    filePath: string;
    mimeType?: string | null;
    sizeBytes: number;
    category: DirectorDocumentCategory;
    uploadedBy?: Types.ObjectId | null;
    createdAt?: Date;
  }): PublicDirectorDocument {
    return {
      id: String(doc._id),
      directorId: String(doc.directorId),
      fileName: doc.fileName,
      filePath: doc.filePath,
      mimeType: doc.mimeType ?? null,
      sizeBytes: doc.sizeBytes,
      category: doc.category,
      uploadedBy: doc.uploadedBy ? String(doc.uploadedBy) : null,
      createdAt: doc.createdAt,
    };
  }
}
