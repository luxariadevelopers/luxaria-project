import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { inr, rupeesToPaise } from '../money';

export default function SalesPage() {
  const [units, setUnits] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [unitForm, setUnitForm] = useState({
    projectId: '',
    clientName: '',
    block: 'A',
    plot: '101',
    fundingType: 'OWN_FUND',
    totalValue: '5000000',
  });
  const [invForm, setInvForm] = useState({
    saleUnitId: '',
    taxable: '1000000',
    cgst: '90000',
    sgst: '90000',
  });

  async function load() {
    const [u, i, p] = await Promise.all([
      api<any[]>('/sales/units'),
      api<any[]>('/sales/invoices'),
      api<any[]>('/projects'),
    ]);
    setUnits(u);
    setInvoices(i);
    setProjects(p);
    setUnitForm((f) => ({ ...f, projectId: f.projectId || p[0]?._id || '' }));
    setInvForm((f) => ({ ...f, saleUnitId: f.saleUnitId || u[0]?._id || '' }));
  }

  useEffect(() => {
    load();
  }, []);

  async function addUnit(e: FormEvent) {
    e.preventDefault();
    await api('/sales/units', {
      method: 'POST',
      body: JSON.stringify({
        ...unitForm,
        totalValuePaise: rupeesToPaise(unitForm.totalValue),
        freezeStatus: 'BOOKED',
      }),
    });
    await load();
  }

  async function addInvoice(e: FormEvent) {
    e.preventDefault();
    const unit = units.find((u) => u._id === invForm.saleUnitId);
    await api('/sales/invoices', {
      method: 'POST',
      body: JSON.stringify({
        projectId: unit?.projectId,
        saleUnitId: invForm.saleUnitId,
        invoiceNumber: `INV-${Date.now()}`,
        taxablePaise: rupeesToPaise(invForm.taxable),
        cgstPaise: rupeesToPaise(invForm.cgst),
        sgstPaise: rupeesToPaise(invForm.sgst),
        igstPaise: 0,
      }),
    });
    await load();
  }

  return (
    <>
      <h1>Sales & client invoices</h1>
      <div className="panel">
        <h2>Freeze / book unit</h2>
        <form onSubmit={addUnit} className="form-row">
          <div className="field">
            <label>Project</label>
            <select value={unitForm.projectId} onChange={(e) => setUnitForm({ ...unitForm, projectId: e.target.value })}>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Client</label>
            <input value={unitForm.clientName} onChange={(e) => setUnitForm({ ...unitForm, clientName: e.target.value })} required />
          </div>
          <div className="field">
            <label>Block</label>
            <input value={unitForm.block} onChange={(e) => setUnitForm({ ...unitForm, block: e.target.value })} />
          </div>
          <div className="field">
            <label>Plot</label>
            <input value={unitForm.plot} onChange={(e) => setUnitForm({ ...unitForm, plot: e.target.value })} />
          </div>
          <div className="field">
            <label>Funding</label>
            <select
              value={unitForm.fundingType}
              onChange={(e) => setUnitForm({ ...unitForm, fundingType: e.target.value })}
            >
              <option value="OWN_FUND">Own fund</option>
              <option value="BANK_LOAN">Bank loan</option>
            </select>
          </div>
          <div className="field">
            <label>Value (₹)</label>
            <input value={unitForm.totalValue} onChange={(e) => setUnitForm({ ...unitForm, totalValue: e.target.value })} />
          </div>
          <button className="btn">Save unit</button>
        </form>
      </div>

      <div className="panel">
        <h2>Raise client tax invoice (GST output)</h2>
        <form onSubmit={addInvoice} className="form-row">
          <div className="field">
            <label>Unit / client</label>
            <select value={invForm.saleUnitId} onChange={(e) => setInvForm({ ...invForm, saleUnitId: e.target.value })}>
              {units.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.clientName} — {u.block}/{u.plot}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Taxable (₹)</label>
            <input value={invForm.taxable} onChange={(e) => setInvForm({ ...invForm, taxable: e.target.value })} />
          </div>
          <div className="field">
            <label>CGST (₹)</label>
            <input value={invForm.cgst} onChange={(e) => setInvForm({ ...invForm, cgst: e.target.value })} />
          </div>
          <div className="field">
            <label>SGST (₹)</label>
            <input value={invForm.sgst} onChange={(e) => setInvForm({ ...invForm, sgst: e.target.value })} />
          </div>
          <button className="btn">Create invoice</button>
        </form>
      </div>

      <div className="panel">
        <h2>Booked units</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Block/Plot</th>
              <th>Funding</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u._id}>
                <td>{u.clientName}</td>
                <td>
                  {u.block}/{u.plot}
                </td>
                <td>{u.fundingType}</td>
                <td>{inr(u.totalValuePaise)}</td>
                <td>{u.freezeStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Client invoices</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Client</th>
              <th>Taxable</th>
              <th>GST</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i._id}>
                <td>{i.invoiceNumber}</td>
                <td>{i.saleUnitId?.clientName}</td>
                <td>{inr(i.taxablePaise)}</td>
                <td>{inr(i.cgstPaise + i.sgstPaise + i.igstPaise)}</td>
                <td>{inr(i.totalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
