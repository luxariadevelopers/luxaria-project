export type CustomerPortalProfile = {
  customerId: string;
  customerCode: string;
  fullName: string;
  customerType: string;
  status: string;
  kycStatus: string;
  contact: {
    email: string | null;
    phone: string | null;
  };
};

export type CustomerPortalOverview = CustomerPortalProfile & {
  bookingCount: number;
  activeSchedules: number;
  outstandingDemands: number;
  openWarranties: number;
};

export type ConstructionProgressSummary = {
  projectId: string;
  approvedDprCount: number;
  message: string;
};
