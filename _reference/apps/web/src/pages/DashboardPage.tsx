import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from '../api';
import { useAuth } from '../auth';
import { inr } from '../money';

type Overview = {
  projects: { _id: string; name: string; stage: string; status: string }[];
  investment: { totalPaise: number; cashPaise: number; bankPaise: number };
  bankBalances: { name: string; balancePaise: number }[];
  cashBalances: { name: string; balancePaise: number; type: string }[];
  expenses: { todayPaise: number; mtdPaise: number };
  gst: { inputPaise: number; outputPaise: number; paidPaise: number; balancePayablePaise: number };
  openPayablesPaise: number;
  pettyCashFloats: { balancePaise: number; holderUserId?: { name?: string } }[];
  todayAttendance: {
    masonCount: number;
    labourCount: number;
    labourContractId?: { contractorName?: string; agreedHeadcount?: number };
  }[];
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const overview = await api<Overview>('/dashboard/overview');
      setData(overview);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:9000', {
      transports: ['websocket'],
    });
    socket.on('connect', () => {
      setLive(true);
      if (user?.companyId) socket.emit('join', [`company:${user.companyId}`]);
    });
    socket.on('disconnect', () => setLive(false));
    const refresh = () => load();
    [
      'expense:created',
      'contribution:created',
      'bill:created',
      'payment:created',
      'invoice:created',
      'stock:received',
      'notification',
    ].forEach((ev) => socket.on(ev, refresh));
    return () => {
      socket.disconnect();
    };
  }, [user?.companyId]);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="muted">Loading overview…</div>;

  const gstBalance = data.gst.balancePayablePaise;

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Directors overview</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Live capital, site spend, stock, and GST position
          </p>
        </div>
        <div className="muted">
          <span className="live-dot" style={{ background: live ? 'var(--ok)' : '#999' }} />
          {live ? 'Live' : 'Connecting…'}
        </div>
      </div>

      <div className="grid">
        <div className="stat accent">
          <label>Total invested</label>
          <strong>{inr(data.investment.totalPaise)}</strong>
        </div>
        <div className="stat">
          <label>Invested in cash</label>
          <strong>{inr(data.investment.cashPaise)}</strong>
        </div>
        <div className="stat">
          <label>Invested in bank</label>
          <strong>{inr(data.investment.bankPaise)}</strong>
        </div>
        <div className="stat">
          <label>Open payables</label>
          <strong>{inr(data.openPayablesPaise)}</strong>
        </div>
        <div className="stat">
          <label>Today expenses</label>
          <strong>{inr(data.expenses.todayPaise)}</strong>
        </div>
        <div className="stat">
          <label>MTD expenses</label>
          <strong>{inr(data.expenses.mtdPaise)}</strong>
        </div>
        <div className="stat">
          <label>GST input</label>
          <strong>{inr(data.gst.inputPaise)}</strong>
        </div>
        <div className="stat">
          <label>{gstBalance >= 0 ? 'GST payable to govt' : 'GST credit'}</label>
          <strong>{inr(Math.abs(gstBalance))}</strong>
        </div>
      </div>

      <div className="panel">
        <h2>Bank & cash</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Type</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {data.bankBalances.map((a) => (
              <tr key={a.name}>
                <td>{a.name}</td>
                <td>BANK</td>
                <td>{inr(a.balancePaise)}</td>
              </tr>
            ))}
            {data.cashBalances.map((a) => (
              <tr key={a.name}>
                <td>{a.name}</td>
                <td>{a.type}</td>
                <td>{inr(a.balancePaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Projects</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Stage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.projects.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>
                  <span className="badge">{p.stage}</span>
                </td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Petty cash with supervisors</h2>
        {data.pettyCashFloats.length === 0 ? (
          <p className="muted">No floats yet</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Holder</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.pettyCashFloats.map((f, i) => (
                <tr key={i}>
                  <td>{f.holderUserId?.name || '—'}</td>
                  <td>{inr(f.balancePaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2>Today attendance</h2>
        {data.todayAttendance.length === 0 ? (
          <p className="muted">No attendance logged today</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Contractor</th>
                <th>Agreed</th>
                <th>Masons</th>
                <th>Labour</th>
              </tr>
            </thead>
            <tbody>
              {data.todayAttendance.map((a, i) => (
                <tr key={i}>
                  <td>{a.labourContractId?.contractorName}</td>
                  <td>{a.labourContractId?.agreedHeadcount}</td>
                  <td>{a.masonCount}</td>
                  <td>{a.labourCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
