import cron from 'node-cron';
import { VendorBill, Vendor } from '../models';
import { notify } from '../services/notifications';

export function startPaymentReminderJob() {
  // Every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = await VendorBill.find({
      status: { $in: ['UNCLEARED', 'PARTIAL'] },
      dueDate: { $lte: soon, $gte: today },
    }).populate('vendorId', 'name');

    for (const bill of due) {
      const vendor = bill.vendorId as unknown as { name?: string };
      await notify({
        companyId: bill.companyId.toString(),
        projectId: bill.projectId.toString(),
        roles: ['FINANCE', 'DIRECTOR'],
        type: 'PAYMENT_DUE',
        title: 'Vendor payment due',
        body: `${vendor?.name || 'Vendor'} bill ${bill.billNumber} — balance ₹${(
          (bill.totalPaise - bill.paidPaise) /
          100
        ).toLocaleString('en-IN')}`,
        meta: { vendorBillId: bill._id.toString() },
      });
    }
  });
}
