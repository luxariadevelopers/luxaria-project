/** Mirrors Nest `apps/backend/src/modules/leads`. */

export const LeadSource = {
  WalkIn: 'walk_in',
  Website: 'website',
  Referral: 'referral',
  ChannelPartner: 'channel_partner',
  ExistingCustomer: 'existing_customer',
  Broker: 'broker',
  DigitalMarketing: 'digital_marketing',
  Campaign: 'campaign',
  Other: 'other',
} as const;

export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];

export const LeadStatus = {
  New: 'new',
  Contacted: 'contacted',
  Qualified: 'qualified',
  SiteVisit: 'site_visit',
  Proposal: 'proposal',
  Negotiation: 'negotiation',
  Won: 'won',
  Lost: 'lost',
} as const;

export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export type LeadContact = {
  fullName: string;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
};

export type PublicLead = {
  id: string;
  leadNumber: string;
  companyId: string | null;
  projectId: string | null;
  source: LeadSource;
  campaignName: string | null;
  status: LeadStatus;
  contact: LeadContact;
  familyDetails: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredLocation: string | null;
  unitPreference: string | null;
  fundingSource: string | null;
  loanRequired: boolean;
  assignedTo: string | null;
  convertedCustomerId: string | null;
  lostReason: string | null;
  notes: string | null;
  siteVisitAt: string | null;
  wonAt: string | null;
  lostAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LeadListRow = Pick<
  PublicLead,
  | 'id'
  | 'leadNumber'
  | 'projectId'
  | 'source'
  | 'status'
  | 'contact'
  | 'assignedTo'
  | 'convertedCustomerId'
  | 'createdAt'
>;

export type ListLeadsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  status?: LeadStatus;
  source?: LeadSource;
  assignedTo?: string;
};

export type PaginatedLeads = {
  items: LeadListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type CreateLeadInput = {
  projectId?: string | null;
  source: LeadSource;
  campaignName?: string | null;
  contact: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    alternatePhone?: string | null;
  };
  notes?: string | null;
  loanRequired?: boolean;
};

export type TransitionLeadInput = {
  status: LeadStatus;
  lostReason?: string | null;
  note?: string | null;
};
