/**
 * Suggested budget category tags for project financial settings.
 * Free-text custom categories are still allowed via Add.
 */
export const BUDGET_CATEGORY_PRESETS = [
  'Land & acquisition',
  'Approvals & statutory',
  'Design & consultancy',
  'Earthwork & excavation',
  'Foundation',
  'Civil / structure',
  'Masonry',
  'MEP — electrical',
  'MEP — plumbing',
  'MEP — HVAC',
  'Fire fighting',
  'Elevators / lifts',
  'Finishing',
  'Interior works',
  'External development',
  'Landscape',
  'Amenities',
  'Common areas',
  'Parking',
  'Temporary works',
  'Plant & machinery',
  'Materials',
  'Labour',
  'Site admin / overheads',
  'Security',
  'Marketing & sales',
  'Brokerage / channel',
  'Finance / interest',
  'Insurance',
  'GST & taxes',
  'Contingency',
  'Miscellaneous',
] as const;

export type BudgetCategoryPreset = (typeof BUDGET_CATEGORY_PRESETS)[number];
