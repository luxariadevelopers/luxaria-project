import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import CapitalPage from './pages/CapitalPage';
import ExpensesPage from './pages/ExpensesPage';
import StockPage from './pages/StockPage';
import PurchasePage from './pages/PurchasePage';
import GstPage from './pages/GstPage';
import LabourPage from './pages/LabourPage';
import SalesPage from './pages/SalesPage';

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          <img className="sidebar-logo" src="/luxaria-logo.png" alt="Luxaria Developers" />
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Overview
          </NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/capital">Capital</NavLink>
          <NavLink to="/expenses">Expenses</NavLink>
          <NavLink to="/stock">Stock</NavLink>
          <NavLink to="/purchase">Purchase</NavLink>
          <NavLink to="/gst">GST</NavLink>
          <NavLink to="/labour">Labour</NavLink>
          <NavLink to="/sales">Sales</NavLink>
        </nav>
        <div style={{ marginTop: 40 }}>
          <div className="muted" style={{ fontSize: 13 }}>
            {user?.name}
          </div>
          <div className="badge" style={{ marginTop: 6 }}>
            {user?.role}
          </div>
          <button className="btn ghost" style={{ marginTop: 14, width: '100%' }} onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Private({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Private>
            <DashboardPage />
          </Private>
        }
      />
      <Route
        path="/projects"
        element={
          <Private>
            <ProjectsPage />
          </Private>
        }
      />
      <Route
        path="/capital"
        element={
          <Private>
            <CapitalPage />
          </Private>
        }
      />
      <Route
        path="/expenses"
        element={
          <Private>
            <ExpensesPage />
          </Private>
        }
      />
      <Route
        path="/stock"
        element={
          <Private>
            <StockPage />
          </Private>
        }
      />
      <Route
        path="/purchase"
        element={
          <Private>
            <PurchasePage />
          </Private>
        }
      />
      <Route
        path="/gst"
        element={
          <Private>
            <GstPage />
          </Private>
        }
      />
      <Route
        path="/labour"
        element={
          <Private>
            <LabourPage />
          </Private>
        }
      />
      <Route
        path="/sales"
        element={
          <Private>
            <SalesPage />
          </Private>
        }
      />
    </Routes>
  );
}
