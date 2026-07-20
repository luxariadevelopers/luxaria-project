import type { Types } from 'mongoose';
import { computeTotalPrice } from './units.validation';
import type {
  UnitFacing,
  UnitStatus,
  UnitType,
} from './schemas/unit.schema';

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export type PublicUnit = {
  id: string;
  projectId: string;
  block: string;
  floor: string;
  unitNumber: string;
  unitType: UnitType;
  carpetArea: number;
  builtUpArea: number;
  uds: number;
  facing: UnitFacing | null;
  parking: string | null;
  basePrice: number;
  additionalCharges: number;
  tax: number;
  totalPrice: number;
  status: UnitStatus;
  bookingRefId: string | null;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type UnitLike = {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  block: string;
  floor: string;
  unitNumber: string;
  unitType: UnitType;
  carpetArea: number;
  builtUpArea: number;
  uds: number;
  facing?: UnitFacing | null;
  parking?: string | null;
  basePrice: number;
  additionalCharges: number;
  tax: number;
  status: UnitStatus;
  bookingRefId?: Types.ObjectId | string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicUnit(row: UnitLike): PublicUnit {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    block: row.block,
    floor: row.floor,
    unitNumber: row.unitNumber,
    unitType: row.unitType,
    carpetArea: row.carpetArea,
    builtUpArea: row.builtUpArea,
    uds: row.uds,
    facing: row.facing ?? null,
    parking: row.parking ?? null,
    basePrice: row.basePrice,
    additionalCharges: row.additionalCharges,
    tax: row.tax,
    totalPrice: computeTotalPrice({
      basePrice: row.basePrice,
      additionalCharges: row.additionalCharges,
      tax: row.tax,
    }),
    status: row.status,
    bookingRefId: oid(row.bookingRefId),
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
