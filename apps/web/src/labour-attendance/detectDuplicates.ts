import type {
  AttendanceDuplicateFlag,
  PublicLabourAttendance,
  PublicLabourAttendanceLine,
} from './types';

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Client display of Nest duplicate rules (category twice; worker code/name).
 * Nest rejects on write; this surfaces flags for review UI / tests.
 */
export function detectSheetDuplicates(
  lines: readonly PublicLabourAttendanceLine[],
): AttendanceDuplicateFlag[] {
  const flags: AttendanceDuplicateFlag[] = [];
  const categorySeen = new Map<string, number>();
  const codeSeen = new Map<string, number>();
  const nameSeen = new Map<string, number>();

  for (const line of lines) {
    const categoryId = line.labourCategoryId;
    const catCount = (categorySeen.get(categoryId) ?? 0) + 1;
    categorySeen.set(categoryId, catCount);
    if (catCount === 2) {
      flags.push({
        kind: 'category',
        key: categoryId,
        label:
          line.labourCategoryName ||
          line.labourCategoryCode ||
          categoryId,
      });
    }

    for (const worker of line.workers) {
      if (worker.workerCode) {
        const code = worker.workerCode.trim().toUpperCase();
        const count = (codeSeen.get(code) ?? 0) + 1;
        codeSeen.set(code, count);
        if (count === 2) {
          flags.push({
            kind: 'worker_code',
            key: code,
            label: code,
          });
        }
      }
      const nameKey = normalizeName(worker.workerName);
      if (nameKey) {
        const count = (nameSeen.get(nameKey) ?? 0) + 1;
        nameSeen.set(nameKey, count);
        if (count === 2) {
          flags.push({
            kind: 'worker_name',
            key: nameKey,
            label: worker.workerName.trim(),
          });
        }
      }
    }
  }

  return flags;
}

/**
 * Flag list rows that share the Nest unique key
 * `(projectId, contractorId, attendanceDate)`.
 */
export function detectListSheetDuplicates(
  sheets: readonly PublicLabourAttendance[],
): Map<string, AttendanceDuplicateFlag[]> {
  const byKey = new Map<string, string[]>();
  for (const sheet of sheets) {
    const day = sheet.attendanceDate.slice(0, 10);
    const key = `${sheet.projectId}|${sheet.contractorId}|${day}`;
    const ids = byKey.get(key) ?? [];
    ids.push(sheet.id);
    byKey.set(key, ids);
  }

  const result = new Map<string, AttendanceDuplicateFlag[]>();
  for (const [key, ids] of byKey) {
    if (ids.length < 2) continue;
    const flag: AttendanceDuplicateFlag = {
      kind: 'sheet_key',
      key,
      label: `Duplicate sheet for project/contractor/date (${ids.length})`,
    };
    for (const id of ids) {
      const existing = result.get(id) ?? [];
      existing.push(flag);
      result.set(id, existing);
    }
  }
  return result;
}
