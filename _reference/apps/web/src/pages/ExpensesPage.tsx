import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { inr, rupeesToPaise } from '../money';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({
    projectId: '',
    accountId: '',
    category: 'SITE',
    amount: '5000',
    narration: '',
  });

  async function load() {
    const [e, r, p, a] = await Promise.all([
      api<any[]>('/expenses'),
      api<any[]>('/expenses/petty-cash/requests'),
      api<any[]>('/projects'),
      api<any[]>('/accounts'),
    ]);
    setExpenses(e);
    setRequests(r);
    setProjects(p);
    setAccounts(a.filter((x) => ['CASH', 'PETTY_CASH', 'BANK'].includes(x.type)));
    if (!form.projectId && p[0]) setForm((f) => ({ ...f, projectId: p[0]._id, accountId: a.find((x) => x.type === 'PETTY_CASH')?._id || a[0]?._id }));
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        projectId: form.projectId,
        accountId: form.accountId,
        category: form.category,
        amountPaise: rupeesToPaise(form.amount),
        narration: form.narration || form.category,
      }),
    });
    await load();
  }

  async function decide(id: string, status: 'APPROVED' | 'REJECTED') {
    const bank = accounts.find((a) => a.type === 'BANK');
    await api(`/expenses/petty-cash/requests/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ status, fromAccountId: bank?._id }),
    });
    await load();
  }

  return (
    <>
      <h1>Expenses & petty cash</h1>
      <div className="panel">
        <h2>Add expense</h2>
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
            <label>Pay from account</label>
            <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Category</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="field">
            <label>Amount (₹)</label>
            <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Narration</label>
            <input value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} />
          </div>
          <button className="btn">Save expense</button>
        </form>
      </div>

      <div className="panel">
        <h2>Petty cash requests</h2>
        <table className="table">
          <thead>
            <tr>
              <th>By</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r._id}>
                <td>{r.requestedBy?.name}</td>
                <td>{inr(r.amountPaise)}</td>
                <td>{r.reason}</td>
                <td>{r.status}</td>
                <td>
                  {r.status === 'PENDING' && (
                    <>
                      <button className="btn" onClick={() => decide(r._id, 'APPROVED')}>
                        Approve
                      </button>{' '}
                      <button className="btn ghost" onClick={() => decide(r._id, 'REJECTED')}>
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Recent expenses</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>By</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e._id}>
                <td>{new Date(e.expenseDate).toLocaleDateString('en-IN')}</td>
                <td>{e.category}</td>
                <td>{e.createdBy?.name}</td>
                <td>{inr(e.amountPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
