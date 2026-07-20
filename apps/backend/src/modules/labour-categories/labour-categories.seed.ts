import { LabourSkillLevel } from './schemas/labour-category.schema';

export type StandardLabourCategorySeed = {
  name: string;
  skillLevel: LabourSkillLevel;
  defaultDailyRate: number;
  overtimeRate: number;
};

/** Standard site labour categories for Luxaria. */
export const STANDARD_LABOUR_CATEGORIES: StandardLabourCategorySeed[] = [
  {
    name: 'Mason',
    skillLevel: LabourSkillLevel.Skilled,
    defaultDailyRate: 900,
    overtimeRate: 1350,
  },
  {
    name: 'Helper',
    skillLevel: LabourSkillLevel.Unskilled,
    defaultDailyRate: 550,
    overtimeRate: 825,
  },
  {
    name: 'Carpenter',
    skillLevel: LabourSkillLevel.Skilled,
    defaultDailyRate: 950,
    overtimeRate: 1425,
  },
  {
    name: 'Bar Bender',
    skillLevel: LabourSkillLevel.Skilled,
    defaultDailyRate: 1000,
    overtimeRate: 1500,
  },
  {
    name: 'Electrician',
    skillLevel: LabourSkillLevel.HighlySkilled,
    defaultDailyRate: 1100,
    overtimeRate: 1650,
  },
  {
    name: 'Plumber',
    skillLevel: LabourSkillLevel.Skilled,
    defaultDailyRate: 1000,
    overtimeRate: 1500,
  },
  {
    name: 'Painter',
    skillLevel: LabourSkillLevel.SemiSkilled,
    defaultDailyRate: 800,
    overtimeRate: 1200,
  },
  {
    name: 'Welder',
    skillLevel: LabourSkillLevel.HighlySkilled,
    defaultDailyRate: 1200,
    overtimeRate: 1800,
  },
  {
    name: 'Supervisor',
    skillLevel: LabourSkillLevel.Supervisory,
    defaultDailyRate: 1500,
    overtimeRate: 2250,
  },
  {
    name: 'Machine Operator',
    skillLevel: LabourSkillLevel.Skilled,
    defaultDailyRate: 1050,
    overtimeRate: 1575,
  },
];
