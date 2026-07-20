import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function LoginPage() {
  const { login, token } = useAuth();
  const [email, setEmail] = useState('director1@luxaria.in');
  const [password, setPassword] = useState('Luxaria@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <img
          className="login-logo"
          src="/luxaria-logo.png"
          alt="Luxaria Developers — Building Spaces, Creating Futures"
        />
        <p className="login-tagline">Directors & finance panel</p>
        <div className="field">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </div>
        <div className="field">
          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted" style={{ fontSize: 13, marginTop: 18, textAlign: 'center' }}>
          Seed: director1@luxaria.in / Luxaria@123
        </p>
      </form>
    </div>
  );
}
