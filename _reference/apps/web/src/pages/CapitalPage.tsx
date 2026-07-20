import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { inr, rupeesToPaise } from '../money';

export default function CapitalPage() {
  const [summary, setSummary] = useState({ cashPaise: 0, bankPaise: 0, totalPaise: 0 });
  const [rows, setRows] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({
    projectId: '',
    investorUserId: '',
    amount: '1000000',
    mode: 'bank',
    accountId: '',
    profitSharePercent: '25',
  });

  async function load() {
    const [s, r, p, u, a] = await Promise.all([
      api<any>('/contributions/summary'),
      api<any[]>('/contributions'),
      api<any[]>('/projects'),
      api<any[]>('/users').catch(() => []),
      api<any[]>('/accounts'),
    ]);
    setSummary(s);
    setRows(r);
    setProjects(p);
    setUsers(u.filter((x: any) => x.role === 'DIRECTOR' || x.role === 'INVESTOR'));
    setAccounts(a.filter((x: any) => x.type === 'BANK' || x.type === 'CASH'));
    if (!form.projectId && p[0]) setForm((f) => ({ ...f, projectId: p[0]._id }));
    if (!form.investorUserId && u[0]) setForm((f) => ({ ...f, investorUserId: u.find((x: any) => x.role === 'DIRECTOR')?._id || '' }));
    if (!form.accountId && a[0]) {
      const bank = a.find((x: any) => x.type === 'BANK');
      setForm((f) => ({ ...f, accountId: bank?._id || a[0]._id }));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await api('/contributions', {
      method: 'POST',
      body: JSON.stringify({
        projectId: form.projectId,
        investorUserId: form.investorUserId,
        investorType: 'DIRECTOR',
        amountPaise: rupeesToPaise(form.amount),
        mode: form.mode,
        accountId: form.accountId,
        profitSharePercent: Number(form.profitSharePercent),
      }),
    });
    await load();
  }

  return (
    <>
      <h1>Capital & investments</h1>
      <div className="grid">
        <div className="stat accent">
          <label>Total</label>
          <strong>{inr(summary.totalPaise)}</strong>
        </div>
        <div className="stat">
          <label>Cash</label>
          <strong>{inr(summary.cashPaise)}</strong>
        </div>
        <div className="stat">
          <label>Bank / account</label>
          <strong>{inr(summary.bankPaise)}</strong>
        </div>
      </div>

      <div className="panel">
        <h2>Record contribution</h2>
        <form onSubmit={submit}>
          <div className="form-row">
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
              <label>Investor</label>
              <select
                value={form.investorUserId}
                onChange={(e) => setForm({ ...form, investorUserId: e.target.value })}
              >
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Amount (₹)</label>
              <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="field">
              <label>Mode</label>
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                <option value="bank">Bank / account</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div className="field">
              <label>Credit account</label>
              <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Project profit share %</label>
              <input
                value={form.profitSharePercent}
                onChange={(e) => setForm({ ...form, profitSharePercent: e.target.value })}
              />
            </div>
          </div>
          <button className="btn">Save contribution</button>
        </form>
      </div>

      <div className="panel">
        <h2>History</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Investor</th>
              <th>Mode</th>
              <th>Account</th>
              <th>Share %</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                <td>{r.investorUserId?.name}</td>
                <td>{r.mode}</td>
                <td>{r.accountId?.name}</td>
                <td>{r.profitSharePercent}%</td>
                <td>{inr(r.amountPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
