export type CustomerPortalProfile = {
  customerId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  bookings: Array<{
    id: string;
    bookingNumber: string;
    unitId: string;
    status: string;
  }>;
  outstandingDues: number;
  recentReceipts: Array<{
    id: string;
    receiptNumber: string;
    amount: number;
    postedAt: string | null;
  }>;
};

export type CustomerPortalDocument = {
  id: string;
  title: string;
  category: string;
  uploadedAt: string | null;
};
