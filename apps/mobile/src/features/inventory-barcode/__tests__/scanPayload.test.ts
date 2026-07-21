describe('inventory barcode payload shape', () => {
  it('builds Luxaria QR text', () => {
    const materialCode = 'MAT-000001';
    const batch = 'BATCH-A1';
    const payload = ['LUX', 'MAT', materialCode, batch].join('|');
    expect(payload).toBe('LUX|MAT|MAT-000001|BATCH-A1');
  });
});
