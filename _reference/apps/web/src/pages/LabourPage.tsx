import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';

export default function LabourPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [form, setForm] = useState({
    projectId: '',
    labourContractId: '',
    masonCount: '2',
    labourCount: '3',
  });

  async function load() {
    const [c, a, p] = await Promise.all([
      api<any[]>('/labour/contracts'),
      api<any[]>('/labour/attendance'),
      api<any[]>('/projects'),
    ]);
    setContracts(c);
    setAttendance(a);
    setProjects(p);
    setForm((f) => ({
      ...f,
      projectId: f.projectId || p[0]?._id || '',
      labourContractId: f.labourContractId || c[0]?._id || '',
    }));
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await api('/labour/attendance', {
      method: 'POST',
      body: JSON.stringify({
        projectId: form.projectId,
        labourContractId: form.labourContractId,
        masonCount: Number(form.masonCount),
        labourCount: Number(form.labourCount),
        date: new Date().toISOString(),
      }),
    });
    await load();
  }

  return (
    <>
      <h1>Labour & attendance</h1>
      <div className="panel">
        <h2>Contracts</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Contractor</th>
              <th>Plan</th>
              <th>Agreed headcount</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c._id}>
                <td>{c.contractorName}</td>
                <td>{c.plan}</td>
                <td>{c.agreedHeadcount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <h2>Mark attendance</h2>
        <form onSubmit={submit} className="form-row">
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
            <label>Contractor</label>
            <select
              value={form.labourContractId}
              onChange={(e) => setForm({ ...form, labourContractId: e.target.value })}
            >
              {contracts.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.contractorName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Masons</label>
            <input value={form.masonCount} onChange={(e) => setForm({ ...form, masonCount: e.target.value })} />
          </div>
          <div className="field">
            <label>Labour</label>
            <input value={form.labourCount} onChange={(e) => setForm({ ...form, labourCount: e.target.value })} />
          </div>
          <button className="btn">Save attendance</button>
        </form>
        <p className="muted" style={{ marginTop: 12 }}>
          If attendance &lt; 50% of agreed headcount, directors & managers get an alert.
        </p>
      </div>
      <div className="panel">
        <h2>Recent attendance</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Contractor</th>
              <th>Masons</th>
              <th>Labour</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((a) => (
              <tr key={a._id}>
                <td>{new Date(a.date).toLocaleDateString('en-IN')}</td>
                <td>{a.labourContractId?.contractorName}</td>
                <td>{a.masonCount}</td>
                <td>{a.labourCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
