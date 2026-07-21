import { apiPost } from '@/api/client';

export type LeadSource =
  | 'walk_in'
  | 'website'
  | 'referral'
  | 'channel_partner'
  | 'existing_customer'
  | 'broker'
  | 'digital_marketing'
  | 'campaign'
  | 'other';

export type CreateLeadInput = {
  projectId?: string | null;
  source: LeadSource;
  contact: {
    fullName: string;
    phone?: string | null;
    email?: string | null;
  };
  notes?: string | null;
};

export type PublicLead = {
  id: string;
  leadNumber: string;
  status: string;
  contact: {
    fullName: string;
    phone: string | null;
  };
};

/** `POST /leads` — `lead.manage` */
export async function createLead(input: CreateLeadInput): Promise<PublicLead> {
  const res = await apiPost<PublicLead>('/leads', input);
  if (!res.data) {
    throw new Error(res.message || 'Create lead failed');
  }
  return res.data;
}
