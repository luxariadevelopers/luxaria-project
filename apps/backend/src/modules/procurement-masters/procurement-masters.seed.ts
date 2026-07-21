export type PaymentTermSeedDef = {
  code: string;
  name: string;
  days: number;
};

export type DeliveryTermSeedDef = {
  code: string;
  name: string;
  description: string;
};

export type TaxRuleSeedDef = {
  code: string;
  name: string;
  gstPercent: number;
};

export const DEFAULT_PAYMENT_TERMS: PaymentTermSeedDef[] = [
  { code: 'NET30', name: 'Net 30 days', days: 30 },
  { code: 'NET45', name: 'Net 45 days', days: 45 },
  { code: 'ADVANCE', name: 'Advance payment', days: 0 },
];

export const DEFAULT_DELIVERY_TERMS: DeliveryTermSeedDef[] = [
  {
    code: 'EXW',
    name: 'Ex Works',
    description: 'Buyer collects goods from seller premises',
  },
  {
    code: 'FOR_SITE',
    name: 'Free on Road — Site',
    description: 'Seller delivers to project site',
  },
];

export const DEFAULT_TAX_RULES: TaxRuleSeedDef[] = [
  { code: 'GST18', name: 'GST 18%', gstPercent: 18 },
  { code: 'GST12', name: 'GST 12%', gstPercent: 12 },
  { code: 'GST5', name: 'GST 5%', gstPercent: 5 },
];
