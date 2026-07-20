import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { inr, rupeesToPaise } from '../money';

type Project = {
  _id: string;
  name: string;
  location?: string;
  stage: string;
  status: string;
  proposedBudgetPaise: number;
  builtUpAreaSqft: number;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('50000000');

  async function load() {
    setProjects(await api<Project[]>('/projects'));
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    await api('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name,
        location,
        proposedBudgetPaise: rupeesToPaise(budget),
        proposedBoqPaise: rupeesToPaise(budget),
      }),
    });
    setName('');
    await load();
  }

  return (
    <>
      <h1>Projects</h1>
      <div className="panel">
        <h2>Add project</h2>
        <form onSubmit={create} className="form-row">
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="field">
            <label>Proposed budget (₹)</label>
            <input value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <div className="field" style={{ justifyContent: 'end' }}>
            <label>&nbsp;</label>
            <button className="btn">Create</button>
          </div>
        </form>
      </div>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Stage</th>
              <th>Budget</th>
              <th>Built-up</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{p.location || '—'}</td>
                <td>
                  <span className="badge">{p.stage}</span>
                </td>
                <td>{inr(p.proposedBudgetPaise)}</td>
                <td>{p.builtUpAreaSqft} sqft</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
