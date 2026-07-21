import type { Types } from 'mongoose';
import type {
  RegistrationWitness,
  SubRegistrarOffice,
  UnitRegistrationStatus,
} from './schemas/unit-registration.schema';

export type PublicSubRegistrarOffice = {
  name: string | null;
  address: string | null;
  district: string | null;
};

export type PublicRegistrationWitness = {
  name: string;
  address: string | null;
  phone: string | null;
};

export type PublicUnitRegistration = {
  id: string;
  registrationNumber: string;
  projectId: string;
  bookingId: string;
  customerId: string;
  unitId: string;
  agreementId: string | null;
  status: UnitRegistrationStatus;
  registrationDate: Date | null;
  documentNumber: string | null;
  ecReference: string | null;
  sro: PublicSubRegistrarOffice;
  stampDuty: number | null;
  registrationCharges: number | null;
  witnesses: PublicRegistrationWitness[];
  documentPath: string | null;
  documentFileName: string | null;
  notes: string | null;
  registeredBy: string | null;
  registeredAt: Date | null;
  cancelledAt: Date | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

function mapSro(row?: SubRegistrarOffice | null): PublicSubRegistrarOffice {
  return {
    name: row?.name ?? null,
    address: row?.address ?? null,
    district: row?.district ?? null,
  };
}

function mapWitness(row: RegistrationWitness): PublicRegistrationWitness {
  return {
    name: row.name,
    address: row.address ?? null,
    phone: row.phone ?? null,
  };
}

export function toPublicUnitRegistration(row: {
  _id: Types.ObjectId | string;
  registrationNumber: string;
  projectId: Types.ObjectId | string;
  bookingId: Types.ObjectId | string;
  customerId: Types.ObjectId | string;
  unitId: Types.ObjectId | string;
  agreementId?: Types.ObjectId | string | null;
  status: UnitRegistrationStatus;
  registrationDate?: Date | null;
  documentNumber?: string | null;
  ecReference?: string | null;
  sro?: SubRegistrarOffice | null;
  stampDuty?: number | null;
  registrationCharges?: number | null;
  witnesses?: RegistrationWitness[];
  documentPath?: string | null;
  documentFileName?: string | null;
  notes?: string | null;
  registeredBy?: Types.ObjectId | string | null;
  registeredAt?: Date | null;
  cancelledAt?: Date | null;
  createdBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicUnitRegistration {
  return {
    id: String(row._id),
    registrationNumber: row.registrationNumber,
    projectId: String(row.projectId),
    bookingId: String(row.bookingId),
    customerId: String(row.customerId),
    unitId: String(row.unitId),
    agreementId: oid(row.agreementId),
    status: row.status,
    registrationDate: row.registrationDate ?? null,
    documentNumber: row.documentNumber ?? null,
    ecReference: row.ecReference ?? null,
    sro: mapSro(row.sro),
    stampDuty: row.stampDuty ?? null,
    registrationCharges: row.registrationCharges ?? null,
    witnesses: (row.witnesses ?? []).map(mapWitness),
    documentPath: row.documentPath ?? null,
    documentFileName: row.documentFileName ?? null,
    notes: row.notes ?? null,
    registeredBy: oid(row.registeredBy),
    registeredAt: row.registeredAt ?? null,
    cancelledAt: row.cancelledAt ?? null,
    createdBy: oid(row.createdBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
