import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { inr, rupeesToPaise } from '../money';

export default function GstPage() {
  const [summary, setSummary] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [amount, setAmount] = useState('');

  async function load() {
    const [s, a] = await Promise.all([api<any>('/gst/summary'), api<any[]>('/accounts')]);
    setSummary(s);
    setAccounts(a.filter((x) => x.type === 'BANK'));
    if (!amount && s.balancePayablePaise > 0) setAmount(String(s.balancePayablePaise / 100));
  }

  useEffect(() => {
    load();
  }, []);

  async function payChallan(e: FormEvent) {
    e.preventDefault();
    await api('/purchase/payments', {
      method: 'POST',
      body: JSON.stringify({
        accountId: accounts[0]?._id,
        amountPaise: rupeesToPaise(amount),
        transactionId: `GST${Date.now()}`,
        type: 'GST_CHALLAN',
        notes: 'GST payment to government',
      }),
    });
    await load();
  }

  if (!summary) return <div className="muted">Loading GST…</div>;

  return (
    <>
      <h1>GST register</h1>
      <p className="muted">Input from vendor bills − Output from client bills = balance to government</p>
      <div className="grid">
        <div className="stat">
          <label>GST input (purchases)</label>
          <strong>{inr(summary.inputPaise)}</strong>
        </div>
        <div className="stat">
          <label>GST output (client bills)</label>
          <strong>{inr(summary.outputPaise)}</strong>
        </div>
        <div className="stat">
          <label>Already paid (challan)</label>
          <strong>{inr(summary.paidPaise)}</strong>
        </div>
        <div className="stat accent">
          <label>{summary.isCredit ? 'GST credit available' : 'Balance to pay government'}</label>
          <strong>{inr(Math.abs(summary.balancePayablePaise))}</strong>
        </div>
      </div>

      {summary.balancePayablePaise > 0 && (
        <div className="panel">
          <h2>Record GST challan payment</h2>
          <form onSubmit={payChallan} className="form-row">
            <div className="field">
              <label>Amount (₹)</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="field">
              <label>&nbsp;</label>
              <button className="btn">Mark paid to government</button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <h2>Input bills</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Bill</th>
              <th>Date</th>
              <th>Taxable</th>
              <th>GST</th>
            </tr>
          </thead>
          <tbody>
            {summary.bills.map((b: any) => (
              <tr key={b.id}>
                <td>{b.billNumber}</td>
                <td>{new Date(b.billDate).toLocaleDateString('en-IN')}</td>
                <td>{inr(b.taxablePaise)}</td>
                <td>{inr(b.gstPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Output invoices</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th>Taxable</th>
              <th>GST</th>
            </tr>
          </thead>
          <tbody>
            {summary.invoices.map((b: any) => (
              <tr key={b.id}>
                <td>{b.invoiceNumber}</td>
                <td>{new Date(b.invoiceDate).toLocaleDateString('en-IN')}</td>
                <td>{inr(b.taxablePaise)}</td>
                <td>{inr(b.gstPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
