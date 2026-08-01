/** Mismo formato que OMP/src/types/territory.ts::getCurrentMonthId — "YYYY-MM". */
export function getCurrentMonthId(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
