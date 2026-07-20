import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import {
  Account,
  AccountCategory,
  AccountSchema,
  AccountStatus,
  AccountType,
} from '../../../src/modules/chart-of-accounts/schemas/account.schema';
import {
  BankAccountStatus,
  BankAccountType,
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from '../../../src/modules/company-bank-accounts/schemas/company-bank-account.schema';
import {
  Customer,
  CustomerFundingType,
  CustomerSchema,
  CustomerStatus,
} from '../../../src/modules/customers/schemas/customer.schema';
import {
  ExpenseCategory,
  ExpenseCategorySchema,
} from '../../../src/modules/expense-categories/schemas/expense-category.schema';
import {
  Material,
  MaterialSchema,
  MaterialStatus,
  MaterialUnit,
} from '../../../src/modules/material-master/schemas/material.schema';
import {
  MaterialStockTransaction,
  MaterialStockTransactionSchema,
} from '../../../src/modules/material-master/schemas/material-stock-transaction.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../../../src/modules/projects/schemas/project.schema';
import {
  Unit,
  UnitSchema,
  UnitStatus,
  UnitType,
} from '../../../src/modules/units/schemas/unit.schema';
import {
  Vendor,
  VendorSchema,
  VendorStatus,
  VendorVerificationStatus,
} from '../../../src/modules/vendors/schemas/vendor.schema';
import { GOLDEN_PATH_IDS, oid } from './seed-ids';

const address = {
  line1: 'Golden Path Site Road',
  line2: null as string | null,
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001',
  country: 'India',
};

export type GoldenPathMasterData = {
  projectId: string;
  materialId: string;
  vendorId: string;
  unitId: string;
  customerId: string;
  companyBankAccountId: string;
  expenseCategoryId: string;
  adminUserId: string;
};

export async function seedGoldenPathMasterData(
  app: INestApplication,
  adminUserId: string,
): Promise<GoldenPathMasterData> {
  const connection = app.get<Connection>(getConnectionToken());

  const projectModel = connection.model(Project.name, ProjectSchema) as Model<Project>;
  const materialModel = connection.model(Material.name, MaterialSchema) as Model<Material>;
  const stockTxnModel = connection.model(
    MaterialStockTransaction.name,
    MaterialStockTransactionSchema,
  ) as Model<MaterialStockTransaction>;
  const vendorModel = connection.model(Vendor.name, VendorSchema) as Model<Vendor>;
  const accountModel = connection.model(Account.name, AccountSchema) as Model<Account>;
  const unitModel = connection.model(Unit.name, UnitSchema) as Model<Unit>;
  const customerModel = connection.model(Customer.name, CustomerSchema) as Model<Customer>;
  const bankModel = connection.model(
    CompanyBankAccount.name,
    CompanyBankAccountSchema,
  ) as Model<CompanyBankAccount>;
  const categoryModel = connection.model(
    ExpenseCategory.name,
    ExpenseCategorySchema,
  ) as Model<ExpenseCategory>;

  await Promise.all([
    projectModel.syncIndexes(),
    materialModel.syncIndexes(),
    vendorModel.syncIndexes(),
    accountModel.syncIndexes(),
    unitModel.syncIndexes(),
    customerModel.syncIndexes(),
    bankModel.syncIndexes(),
  ]);

  await accountModel.create([
    {
      _id: oid(GOLDEN_PATH_IDS.materialExpenseAccount),
      accountCode: 'GP-EXP-MAT',
      accountName: 'GP Material Purchase',
      accountType: AccountType.Expense,
      accountCategory: AccountCategory.MaterialPurchase,
      level: 2,
      allowManualPosting: true,
      status: AccountStatus.Active,
    },
    {
      _id: oid(GOLDEN_PATH_IDS.wipAccount),
      accountCode: 'GP-1150',
      accountName: 'GP WIP',
      accountType: AccountType.Asset,
      accountCategory: AccountCategory.WorkInProgress,
      level: 2,
      allowManualPosting: true,
      status: AccountStatus.Active,
    },
    {
      _id: oid(GOLDEN_PATH_IDS.vendorPayableAccount),
      accountCode: 'GP-2100',
      accountName: 'GP Vendor Payable',
      accountType: AccountType.Liability,
      accountCategory: AccountCategory.VendorPayable,
      level: 2,
      allowManualPosting: true,
      status: AccountStatus.Active,
    },
    {
      _id: oid(GOLDEN_PATH_IDS.bankLedgerAccount),
      accountCode: 'GP-1110',
      accountName: 'GP Bank',
      accountType: AccountType.Asset,
      accountCategory: AccountCategory.Bank,
      level: 2,
      allowManualPosting: true,
      status: AccountStatus.Active,
    },
    {
      _id: oid(GOLDEN_PATH_IDS.customerAdvanceAccount),
      accountCode: 'GP-2140',
      accountName: 'GP Customer Advance',
      accountType: AccountType.Liability,
      accountCategory: AccountCategory.CustomerAdvance,
      level: 1,
      allowManualPosting: true,
      requiresProject: true,
      requiresParty: true,
      status: AccountStatus.Active,
    },
    {
      _id: oid(GOLDEN_PATH_IDS.pettyCashLedgerAccount),
      accountCode: 'GP-1120',
      accountName: 'GP Petty Cash',
      accountType: AccountType.Asset,
      accountCategory: AccountCategory.PettyCash,
      level: 1,
      allowManualPosting: true,
      status: AccountStatus.Active,
    },
    {
      _id: oid(GOLDEN_PATH_IDS.siteExpenseAccount),
      accountCode: 'GP-5100',
      accountName: 'GP Site Expense',
      accountType: AccountType.Expense,
      accountCategory: AccountCategory.DirectExpense,
      level: 2,
      allowManualPosting: true,
      status: AccountStatus.Active,
    },
  ]);

  await projectModel.create({
    _id: oid(GOLDEN_PATH_IDS.project),
    projectCode: 'GP-PRJ-138',
    projectName: 'Golden Path Tower',
    projectType: ProjectType.Residential,
    address,
    status: ProjectStatus.Construction,
  });

  await materialModel.create({
    _id: oid(GOLDEN_PATH_IDS.material),
    materialCode: 'GP-MAT-138',
    name: 'GP OPC Cement',
    category: 'cement',
    baseUnit: MaterialUnit.Bag,
    alternateUnits: [],
    conversionFactors: [],
    standardRate: 380,
    minimumStock: 20,
    reorderLevel: 50,
    maximumStock: 200,
    standardWastagePercentage: 2,
    ledgerAccountId: oid(GOLDEN_PATH_IDS.materialExpenseAccount),
    status: MaterialStatus.Active,
  });

  await stockTxnModel.create({
    transactionNumber: 'GP-SL-138-001',
    materialId: oid(GOLDEN_PATH_IDS.material),
    projectId: oid(GOLDEN_PATH_IDS.project),
    transactionType: 'opening_stock',
    quantityIn: 30,
    quantityOut: 0,
    unit: MaterialUnit.Bag,
    baseUnitQuantity: 30,
    quantityInBaseUnit: 30,
    baseUnit: MaterialUnit.Bag,
    referenceType: 'opening',
    referenceId: null,
    transactionDate: new Date('2026-07-01'),
    location: null,
    batch: null,
    createdBy: oid(adminUserId),
  });

  await vendorModel.create({
    _id: oid(GOLDEN_PATH_IDS.vendor),
    vendorCode: 'GP-VEN-138',
    legalName: 'Golden Path Cement Suppliers',
    status: VendorStatus.Active,
    verificationStatus: VendorVerificationStatus.Verified,
  });

  await unitModel.create({
    _id: oid(GOLDEN_PATH_IDS.unit),
    projectId: oid(GOLDEN_PATH_IDS.project),
    block: 'A',
    floor: '10',
    unitNumber: 'GP-101',
    unitType: UnitType.TwoBhk,
    carpetArea: 980,
    builtUpArea: 1150,
    uds: 350,
    basePrice: 8_000_000,
    additionalCharges: 200_000,
    tax: 400_000,
    status: UnitStatus.Available,
  });

  await customerModel.create({
    _id: oid(GOLDEN_PATH_IDS.customer),
    customerCode: 'GP-CUS-138',
    fullName: 'Golden Path Buyer',
    pan: 'GPAAA1380A',
    fundingType: CustomerFundingType.OwnFunds,
    status: CustomerStatus.Active,
    contact: {
      email: 'buyer@golden-path.test',
      phone: '9000000139',
      alternatePhone: null,
    },
    address: {},
  });

  await bankModel.create({
    _id: oid(GOLDEN_PATH_IDS.companyBankAccount),
    accountCode: 'GP-BA-138',
    bankName: 'HDFC Bank',
    branch: 'Chennai',
    accountHolderName: 'Luxaria Developers Pvt Ltd',
    maskedAccountNumber: 'XXXXXX0138',
    encryptedAccountNumber: 'enc:v1:golden-path-test',
    ifsc: 'HDFC0000138',
    accountType: BankAccountType.Current,
    ledgerAccountId: oid(GOLDEN_PATH_IDS.bankLedgerAccount),
    openingBalance: 0,
    status: BankAccountStatus.Active,
    projectId: null,
  });

  const category = await categoryModel
    .findOne({ categoryCode: 'TRANSPORT' })
    .select('_id')
    .lean()
    .exec();
  if (!category?._id) {
    throw new Error('Expense category TRANSPORT not seeded — cannot run petty-cash golden path');
  }
  await categoryModel.updateOne(
    { _id: category._id },
    { $set: { defaultLedgerAccountId: oid(GOLDEN_PATH_IDS.siteExpenseAccount) } },
  );

  return {
    projectId: GOLDEN_PATH_IDS.project,
    materialId: GOLDEN_PATH_IDS.material,
    vendorId: GOLDEN_PATH_IDS.vendor,
    unitId: GOLDEN_PATH_IDS.unit,
    customerId: GOLDEN_PATH_IDS.customer,
    companyBankAccountId: GOLDEN_PATH_IDS.companyBankAccount,
    expenseCategoryId: String(category._id),
    adminUserId,
  };
}
