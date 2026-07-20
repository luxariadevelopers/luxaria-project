/**
 * Excel columns from Nest `BOQ_EXCEL_HEADERS` / BOQ_API.md.
 * Required set matches `BoqExcelService.parseImportBuffer`.
 */
export const BOQ_EXCEL_HEADERS = [
  'blockCode',
  'blockName',
  'floorCode',
  'floorName',
  'floorLevel',
  'categoryCode',
  'categoryName',
  'boqCode',
  'description',
  'unit',
  'plannedQuantity',
  'materialCost',
  'labourCost',
  'subcontractCost',
  'otherCost',
  'plannedRate',
  'plannedValue',
  'startDate',
  'endDate',
  'materialCoefficients',
  'status',
] as const;

export type BoqExcelHeader = (typeof BOQ_EXCEL_HEADERS)[number];

/** Required columns — Nest rejects the workbook when any are missing. */
export const BOQ_REQUIRED_EXCEL_COLUMNS = [
  'blockCode',
  'floorCode',
  'categoryCode',
  'description',
  'unit',
  'plannedQuantity',
] as const;

export type BoqRequiredExcelColumn =
  (typeof BOQ_REQUIRED_EXCEL_COLUMNS)[number];
