import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import { toPublicMaterial } from '../material-master/materials.mapper';
import { StockLedgerService } from '../stock-ledger/stock-ledger.service';
import type { GenerateBarcodeDto, ScanBarcodeDto } from './dto/barcode.dto';
import { BarcodeAction } from './dto/barcode.dto';

const PREFIX = 'LUX|MAT';

@Injectable()
export class InventoryBarcodeService {
  constructor(
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    private readonly stockLedgerService: StockLedgerService,
  ) {}

  async generate(dto: GenerateBarcodeDto) {
    const material = await this.requireMaterial(dto.materialId);
    const code = (material.barcode || material.materialCode).toUpperCase();
    if (!material.barcode) {
      material.barcode = code;
      await material.save();
    }
    const parts = [PREFIX, code];
    if (dto.batch?.trim()) parts.push(dto.batch.trim().toUpperCase());
    const payload = parts.join('|');

    return createSuccessResponse(
      {
        materialId: String(material._id),
        materialCode: material.materialCode,
        barcode: code,
        payload,
        qrText: payload,
        projectId: dto.projectId ?? null,
        batch: dto.batch?.trim().toUpperCase() ?? null,
      },
      'Barcode generated',
    );
  }

  async scan(dto: ScanBarcodeDto) {
    const parsed = this.parsePayload(dto.payload);
    const material = await this.materialModel
      .findOne({
        $or: [
          { materialCode: parsed.materialCode },
          { barcode: parsed.materialCode },
        ],
        status: MaterialStatus.Active,
      })
      .exec();
    if (!material) {
      throw new NotFoundException('Material not found for scanned code');
    }

    let balance: {
      onHandBaseQty: number;
      projectId: string | null;
    } | null = null;

    if (dto.projectId && Types.ObjectId.isValid(dto.projectId)) {
      const qty = await this.stockLedgerService.getQuantityInBaseUnit({
        materialId: String(material._id),
        projectId: dto.projectId,
      });
      balance = { onHandBaseQty: qty, projectId: dto.projectId };
    }

    const action = dto.action ?? BarcodeAction.Lookup;
    return createSuccessResponse(
      {
        action,
        payload: dto.payload.trim(),
        materialCode: parsed.materialCode,
        batch: parsed.batch,
        material: toPublicMaterial(material, false),
        balance,
        suggestedNext:
          action === BarcodeAction.Lookup
            ? ['receive', 'issue', 'transfer', 'count']
            : [action],
      },
      'Barcode scanned',
    );
  }

  private parsePayload(raw: string): {
    materialCode: string;
    batch: string | null;
  } {
    const payload = raw.trim();
    if (!payload) {
      throw new BadRequestException('Empty barcode payload');
    }
    if (payload.includes('|')) {
      const parts = payload.split('|').map((p) => p.trim()).filter(Boolean);
      // LUX|MAT|<code>[|batch]
      if (parts.length >= 3 && parts[0] === 'LUX' && parts[1] === 'MAT') {
        return {
          materialCode: parts[2].toUpperCase(),
          batch: parts[3]?.toUpperCase() ?? null,
        };
      }
      throw new BadRequestException('Unrecognized Luxaria barcode format');
    }
    return { materialCode: payload.toUpperCase(), batch: null };
  }

  private async requireMaterial(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid material id');
    }
    const material = await this.materialModel.findById(id).exec();
    if (!material) throw new NotFoundException('Material not found');
    return material;
  }
}
