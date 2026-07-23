import {
  formatEmployeeId,
  previewEmployeeId,
  toEmploymentCode,
} from './employee-id';

describe('employee-id', () => {
  it('builds codes from department and designation names', () => {
    expect(toEmploymentCode('Site Engineer')).toBe('SE');
    expect(toEmploymentCode('Senior Site Engineer')).toBe('SSE');
    expect(
      formatEmployeeId(
        'Engineering & Construction',
        'Site Engineer',
        42,
      ),
    ).toBe('ENG-SE-000042');
  });

  it('previews without a sequence', () => {
    expect(
      previewEmployeeId('Finance & Accounts', 'Accountant'),
    ).toBe('FIN-ACCO-······');
    expect(previewEmployeeId('Finance & Accounts', '')).toBe('');
  });
});
