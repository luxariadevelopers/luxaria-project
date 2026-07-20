import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';

export default function StockPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [form, setForm] = useState({ projectId: '', materialId: '', vendorId: '', qty: '1000' });

  async function load() {
    const [m, mv, p, v] = await Promise.all([
      api<any[]>('/stock/materials'),
      api<any[]>('/stock/movements'),
      api<any[]>('/projects'),
      api<any[]>('/purchase/vendors'),
    ]);
    setMaterials(m);
    setMovements(mv);
    setProjects(p);
    setVendors(v);
    setForm((f) => ({
      ...f,
      projectId: f.projectId || p[0]?._id || '',
      materialId: f.materialId || m[0]?._id || '',
      vendorId: f.vendorId || v[0]?._id || '',
    }));
  }

  useEffect(() => {
    load();
  }, []);

  async function receive(e: FormEvent) {
    e.preventDefault();
    await api('/stock/receive', {
      method: 'POST',
      body: JSON.stringify({
        projectId: form.projectId,
        materialId: form.materialId,
        vendorId: form.vendorId || undefined,
        qty: Number(form.qty),
      }),
    });
    await load();
  }

  async function lowStock() {
    await api('/stock/low-stock-alert', {
      method: 'POST',
      body: JSON.stringify({
        projectId: form.projectId,
        materialId: form.materialId,
        qty: Number(form.qty),
        notes: 'Load finishing this week — please order',
      }),
    });
    await load();
  }

  return (
    <>
      <h1>Stock register</h1>
      <div className="panel">
        <h2>Receive material (GRN)</h2>
        <form onSubmit={receive} className="form-row">
          <div className="field">
            <label>Project</label>
            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Material</label>
            <select value={form.materialId} onChange={(e) => setForm({ ...form, materialId: e.target.value })}>
              {materials.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Vendor</label>
            <select value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Qty</label>
            <input value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          </div>
          <button className="btn">Receive</button>
          <button type="button" className="btn ghost" onClick={lowStock}>
            Flag low stock / reorder
          </button>
        </form>
      </div>
      <div className="panel">
        <h2>Movements</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Material</th>
              <th>Type</th>
              <th>Qty</th>
              <th>By</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m._id}>
                <td>{new Date(m.movementDate).toLocaleDateString('en-IN')}</td>
                <td>{m.materialId?.name}</td>
                <td>
                  {m.type}
                  {m.lowStockAlert ? ' / ALERT' : ''}
                </td>
                <td>
                  {m.qty} {m.materialId?.unit}
                </td>
                <td>{m.createdBy?.name}</td>
                <td>{m.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
