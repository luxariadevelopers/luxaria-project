import { BadRequestException } from '@nestjs/common';
import { InventoryBarcodeService } from './inventory-barcode.service';

describe('InventoryBarcodeService', () => {
  const service = new InventoryBarcodeService({} as never, {} as never);

  it('parses Luxaria QR payloads', () => {
    const parsed = (
      service as unknown as {
        parsePayload: (raw: string) => {
          materialCode: string;
          batch: string | null;
        };
      }
    ).parsePayload('LUX|MAT|MAT-000001|BATCH-A1');
    expect(parsed.materialCode).toBe('MAT-000001');
    expect(parsed.batch).toBe('BATCH-A1');
  });

  it('accepts plain material codes', () => {
    const parsed = (
      service as unknown as {
        parsePayload: (raw: string) => {
          materialCode: string;
          batch: string | null;
        };
      }
    ).parsePayload('mat-000099');
    expect(parsed.materialCode).toBe('MAT-000099');
    expect(parsed.batch).toBeNull();
  });

  it('rejects empty payloads', () => {
    expect(() =>
      (
        service as unknown as {
          parsePayload: (raw: string) => unknown;
        }
      ).parsePayload('   '),
    ).toThrow(BadRequestException);
  });
});
