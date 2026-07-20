import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { COMPANY_DEFAULTS, toPaise } from '@luxaria/shared';
import { config } from './config';
import {
  Company,
  User,
  Project,
  Account,
  Material,
  Contribution,
  PettyCashFloat,
  BoqLine,
  LabourContract,
  Vendor,
} from './models';

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected — seeding Luxaria...');

  await Promise.all([
    Company.deleteMany({}),
    User.deleteMany({}),
    Project.deleteMany({}),
    Account.deleteMany({}),
    Material.deleteMany({}),
    Contribution.deleteMany({}),
    PettyCashFloat.deleteMany({}),
    BoqLine.deleteMany({}),
    LabourContract.deleteMany({}),
    Vendor.deleteMany({}),
  ]);

  const company = await Company.create({
    name: COMPANY_DEFAULTS.name,
    shareCapitalPaise: COMPANY_DEFAULTS.shareCapitalPaise,
    gstin: '33AAAAA0000A1Z5',
    address: 'Tamil Nadu, India',
  });

  const passwordHash = await bcrypt.hash('Luxaria@123', 10);
  const directors = await User.insertMany(
    [1, 2, 3, 4].map((n) => ({
      companyId: company._id,
      name: `Director ${n}`,
      email: `director${n}@luxaria.in`,
      passwordHash,
      role: 'DIRECTOR' as const,
      projectIds: [],
    }))
  );

  const finance = await User.create({
    companyId: company._id,
    name: 'Finance Lead',
    email: 'finance@luxaria.in',
    passwordHash,
    role: 'FINANCE',
    projectIds: [],
  });

  const purchase = await User.create({
    companyId: company._id,
    name: 'Purchase Lead',
    email: 'purchase@luxaria.in',
    passwordHash,
    role: 'PURCHASE',
    projectIds: [],
  });

  const manager = await User.create({
    companyId: company._id,
    name: 'Site Manager',
    email: 'manager@luxaria.in',
    passwordHash,
    role: 'MANAGER',
    projectIds: [],
  });

  const engineer = await User.create({
    companyId: company._id,
    name: 'Site Engineer',
    email: 'engineer@luxaria.in',
    passwordHash,
    role: 'SITE_ENGINEER',
    projectIds: [],
  });

  const project = await Project.create({
    companyId: company._id,
    name: 'Luxaria Heights — Phase 1',
    location: 'Chennai',
    stage: 'FOUNDATION',
    proposedBudgetPaise: toPaise(5_00_00_000),
    proposedBoqPaise: toPaise(4_50_00_000),
    builtUpAreaSqft: 1200,
  });

  await User.updateMany(
    { _id: { $in: [...directors.map((d) => d._id), finance._id, purchase._id, manager._id, engineer._id] } },
    { $set: { projectIds: [project._id] } }
  );

  const icici = await Account.create({
    companyId: company._id,
    name: 'ICICI Bank — Current',
    type: 'BANK',
    bankName: 'ICICI',
    accountNumberMasked: 'XXXX4521',
    balancePaise: 0,
  });

  const cashHo = await Account.create({
    companyId: company._id,
    name: 'Cash — Head Office',
    type: 'CASH',
    balancePaise: 0,
  });

  const petty = await Account.create({
    companyId: company._id,
    projectId: project._id,
    name: 'Petty Cash — Site Engineer',
    type: 'PETTY_CASH',
    holderUserId: engineer._id,
    balancePaise: toPaise(50_000),
  });

  await Account.insertMany([
    { companyId: company._id, name: 'Director Capital / Equity', type: 'OTHER', balancePaise: 0 },
    { companyId: company._id, name: 'Project Expenses', type: 'OTHER', balancePaise: 0 },
    { companyId: company._id, name: 'Vendor Payables', type: 'OTHER', balancePaise: 0 },
    { companyId: company._id, name: 'Client Advances', type: 'OTHER', balancePaise: 0 },
    { companyId: company._id, name: 'Client Receivables', type: 'OTHER', balancePaise: 0 },
    { companyId: company._id, name: 'GST Input Credit', type: 'GST_INPUT', balancePaise: 0 },
    { companyId: company._id, name: 'GST Output Liability', type: 'GST_OUTPUT', balancePaise: 0 },
    { companyId: company._id, name: 'GST Payable to Government', type: 'GST_PAYABLE', balancePaise: 0 },
  ]);

  await PettyCashFloat.create({
    companyId: company._id,
    projectId: project._id,
    holderUserId: engineer._id,
    accountId: petty._id,
    floatPaise: toPaise(50_000),
    balancePaise: toPaise(50_000),
  });

  // Seed opening capital: each director ₹25L — mix of cash and bank
  for (let i = 0; i < directors.length; i++) {
    const d = directors[i];
    const mode = i % 2 === 0 ? 'bank' : 'cash';
    const accountId = mode === 'bank' ? icici._id : cashHo._id;
    const amountPaise = toPaise(25_00_000);
    await Contribution.create({
      companyId: company._id,
      projectId: project._id,
      investorUserId: d._id,
      investorType: 'DIRECTOR',
      amountPaise,
      mode,
      accountId,
      profitSharePercent: 25,
      date: new Date(),
      notes: 'Seed capital contribution',
      createdBy: finance._id,
    });
    await Account.findByIdAndUpdate(accountId, { $inc: { balancePaise: amountPaise } });
  }

  await Material.insertMany([
    { companyId: company._id, name: 'Bricks', unit: 'nos', normPerSqft: 8 },
    { companyId: company._id, name: 'Cement', unit: 'bags', normPerSqft: 0.4 },
    { companyId: company._id, name: 'Steel TMT', unit: 'kg', normPerSqft: 3.5 },
    { companyId: company._id, name: 'Sand', unit: 'cft', normPerSqft: 1.2 },
    { companyId: company._id, name: 'M-Sand', unit: 'cft', normPerSqft: 1 },
  ]);

  await BoqLine.insertMany([
    {
      companyId: company._id,
      projectId: project._id,
      category: 'MATERIAL',
      description: 'Civil materials',
      proposedPaise: toPaise(2_00_00_000),
    },
    {
      companyId: company._id,
      projectId: project._id,
      category: 'LABOUR',
      description: 'Labour contracts',
      proposedPaise: toPaise(1_50_00_000),
    },
    {
      companyId: company._id,
      projectId: project._id,
      category: 'OTHER',
      description: 'Approvals & misc',
      proposedPaise: toPaise(1_00_00_000),
    },
  ]);

  await LabourContract.create({
    companyId: company._id,
    projectId: project._id,
    contractorName: 'Raja Labour Contractor',
    phone: '9876543210',
    plan: 'DAILY',
    agreedHeadcount: 10,
    ratePaise: toPaise(800),
  });

  await Vendor.create({
    companyId: company._id,
    name: 'Sri Materials Suppliers',
    gstin: '33BBBBB0000B1Z5',
    phone: '9876501234',
    paymentTerms: 'WEEKLY',
  });

  console.log('\nSeed complete.\n');
  console.log('Company:', company.name);
  console.log('Project:', project.name);
  console.log('\nLogins (password: Luxaria@123):');
  console.log('  director1@luxaria.in … director4@luxaria.in');
  console.log('  finance@luxaria.in');
  console.log('  purchase@luxaria.in');
  console.log('  manager@luxaria.in');
  console.log('  engineer@luxaria.in');
  console.log(`\nAPI: http://localhost:${config.port}`);

  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
