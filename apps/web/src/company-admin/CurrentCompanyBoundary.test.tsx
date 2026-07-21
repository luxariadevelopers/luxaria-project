import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrentCompanyBoundary } from './CurrentCompanyBoundary';
import { CompanyStatus, type PublicCompany } from './types';

const authState = vi.hoisted(() => ({
  companyId: '507f1f77bcf86cd799439011' as string | null,
  permissions: ['company.view', 'company.update', 'company.upload_logo'] as string[],
}));

const fetchCurrentCompany = vi.hoisted(() => vi.fn());

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      companyId: authState.companyId,
    },
    access: {
      permissions: authState.permissions,
      bypassPermissions: false,
    },
    hasPermission: (permission: string) => authState.permissions.includes(permission),
  }),
}));

vi.mock('./api', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    fetchCurrentCompany: (...args: unknown[]) => fetchCurrentCompany(...args),
  };
});

const company: PublicCompany = {
  id: '507f1f77bcf86cd799439011',
  companyCode: 'LUX-001',
  legalName: 'Luxaria Developers Private Limited',
  tradeName: 'Luxaria',
  cin: null,
  pan: null,
  tan: null,
  gstin: null,
  registeredAddress: {
    line1: '12 Main Road',
    line2: null,
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    country: 'India',
  },
  corporateAddress: {
    line1: '14 Main Road',
    line2: null,
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600002',
    country: 'India',
  },
  email: null,
  phone: null,
  website: null,
  authorisedShareCapital: 10_000_000,
  paidUpShareCapital: 5_000_000,
  financialYearStartMonth: 4,
  logo: null,
  status: CompanyStatus.Active,
  isPrimary: true,
};

function renderBoundary(path: string, routePath = '/companies/:companyId') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path={routePath}
            element={
              <CurrentCompanyBoundary>
                {({ company: current, canUpdate, canUploadLogo }) => (
                  <div>
                    <span>{current.tradeName}</span>
                    <span>update:{String(canUpdate)}</span>
                    <span>logo:{String(canUploadLogo)}</span>
                  </div>
                )}
              </CurrentCompanyBoundary>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CurrentCompanyBoundary', () => {
  beforeEach(() => {
    authState.companyId = company.id;
    authState.permissions = ['company.view', 'company.update', 'company.upload_logo'];
    fetchCurrentCompany.mockReset();
    fetchCurrentCompany.mockResolvedValue(company);
  });

  it('blocks a foreign route id without making a company request', () => {
    renderBoundary('/companies/507f1f77bcf86cd799439099');

    expect(screen.getByText(/does not match your authenticated company/i)).toBeInTheDocument();
    expect(fetchCurrentCompany).not.toHaveBeenCalled();
  });

  it('also blocks routes registered with a generic :id parameter', () => {
    renderBoundary('/company/507f1f77bcf86cd799439099', '/company/:id');

    expect(screen.getByText(/does not match your authenticated company/i)).toBeInTheDocument();
    expect(fetchCurrentCompany).not.toHaveBeenCalled();
  });

  it('requests only the authenticated company id for a matching route', async () => {
    renderBoundary(`/companies/${company.id}`);

    expect(await screen.findByText('Luxaria')).toBeInTheDocument();
    expect(fetchCurrentCompany).toHaveBeenCalledWith(company.id);
  });

  it('uses the primary-company contract when auth has no company id', async () => {
    authState.companyId = null;
    renderBoundary('/company', '/company');

    expect(await screen.findByText('Luxaria')).toBeInTheDocument();
    expect(fetchCurrentCompany).toHaveBeenCalledWith(null);
  });

  it('gates view and action capabilities with exact permissions', async () => {
    authState.permissions = ['company.view', 'company.upload_logo'];
    renderBoundary(`/companies/${company.id}`);

    expect(await screen.findByText('update:false')).toBeInTheDocument();
    expect(screen.getByText('logo:true')).toBeInTheDocument();

    authState.permissions = [];
    fetchCurrentCompany.mockClear();
    renderBoundary(`/companies/${company.id}`);
    await waitFor(() => {
      expect(screen.getByText(/need company\.view/i)).toBeInTheDocument();
    });
    expect(fetchCurrentCompany).not.toHaveBeenCalled();
  });
});
