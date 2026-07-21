export const DEFAULT_TDS_SECTIONS = [
  {
    sectionCode: '194C',
    name: 'Payments to contractors / sub-contractors',
    ratePercent: 1,
    thresholdAmount: 30_000,
    notes: 'Individual/HUF 1%; others 2% — seeded at 1% baseline',
  },
  {
    sectionCode: '194J',
    name: 'Fees for professional or technical services',
    ratePercent: 10,
    thresholdAmount: 30_000,
    notes: 'Professional / technical services',
  },
  {
    sectionCode: '194Q',
    name: 'Purchase of goods',
    ratePercent: 0.1,
    thresholdAmount: 5_000_000,
    notes: 'Buyer TDS on purchase of goods exceeding threshold',
  },
] as const;
