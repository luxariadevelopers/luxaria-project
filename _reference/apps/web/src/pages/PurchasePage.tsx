import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { inr, rupeesToPaise } from '../money';

export default function PurchasePage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [billForm, setBillForm] = useState({
    projectId: '',
    vendorId: '',
    billNumber: '',
    taxable: '100000',
    cgst: '9000',
    sgst: '9000',
    igst: '0',
  });

  async function load() {
    const [v, b, p, a] = await Promise.all([
      api<any[]>('/purchase/vendors'),
      api<any[]>('/purchase/bills'),
      api<any[]>('/projects'),
      api<any[]>('/accounts'),
    ]);
    setVendors(v);
    setBills(b);
    setProjects(p);
    setAccounts(a.filter((x) => x.type === 'BANK'));
    setBillForm((f) => ({
      ...f,
      projectId: f.projectId || p[0]?._id || '',
      vendorId: f.vendorId || v[0]?._id || '',
    }));
  }

  useEffect(() => {
    load();
  }, []);

  async function addBill(e: FormEvent) {
    e.preventDefault();
    await api('/purchase/bills', {
      method: 'POST',
      body: JSON.stringify({
        projectId: billForm.projectId,
        vendorId: billForm.vendorId,
        billNumber: billForm.billNumber || `BILL-${Date.now()}`,
        taxablePaise: rupeesToPaise(billForm.taxable),
        cgstPaise: rupeesToPaise(billForm.cgst),
        sgstPaise: rupeesToPaise(billForm.sgst),
        igstPaise: rupeesToPaise(billForm.igst),
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      }),
    });
    await load();
  }

  async function pay(bill: any) {
    const accountId = accounts[0]?._id;
    if (!accountId) return alert('No bank account');
    const balance = bill.totalPaise - bill.paidPaise;
    await api('/purchase/payments', {
      method: 'POST',
      body: JSON.stringify({
        projectId: bill.projectId,
        vendorId: bill.vendorId?._id || bill.vendorId,
        vendorBillId: bill._id,
        accountId,
        amountPaise: balance,
        transactionId: `TXN${Date.now()}`,
        type: 'VENDOR',
      }),
    });
    await load();
  }

  return (
    <>
      <h1>Purchase & vendors</h1>
      <div className="panel">
        <h2>Upload vendor bill (with GST input)</h2>
        <form onSubmit={addBill} className="form-row">
          <div className="field">
            <label>Project</label>
            <select value={billForm.projectId} onChange={(e) => setBillForm({ ...billForm, projectId: e.target.value })}>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Vendor</label>
            <select value={billForm.vendorId} onChange={(e) => setBillForm({ ...billForm, vendorId: e.target.value })}>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Bill no</label>
            <input value={billForm.billNumber} onChange={(e) => setBillForm({ ...billForm, billNumber: e.target.value })} />
          </div>
          <div className="field">
            <label>Taxable (₹)</label>
            <input value={billForm.taxable} onChange={(e) => setBillForm({ ...billForm, taxable: e.target.value })} />
          </div>
          <div className="field">
            <label>CGST (₹)</label>
            <input value={billForm.cgst} onChange={(e) => setBillForm({ ...billForm, cgst: e.target.value })} />
          </div>
          <div className="field">
            <label>SGST (₹)</label>
            <input value={billForm.sgst} onChange={(e) => setBillForm({ ...billForm, sgst: e.target.value })} />
          </div>
          <button className="btn">Save bill</button>
        </form>
      </div>
      <div className="panel">
        <h2>Bills</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Bill</th>
              <th>Vendor</th>
              <th>Taxable</th>
              <th>GST</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b._id}>
                <td>{b.billNumber}</td>
                <td>{b.vendorId?.name}</td>
                <td>{inr(b.taxablePaise)}</td>
                <td>{inr(b.cgstPaise + b.sgstPaise + b.igstPaise)}</td>
                <td>{inr(b.totalPaise)}</td>
                <td>{b.status}</td>
                <td>
                  {b.status !== 'CLEARED' && (
                    <button className="btn" onClick={() => pay(b)}>
                      Pay balance
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
