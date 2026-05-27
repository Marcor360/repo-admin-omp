import type { Timestamp } from 'firebase/firestore';

export function formatDate(value?: Timestamp | Date | null): string {
  if (!value) return 'Sin fecha';

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof (value as any).toDate === 'function') {
    date = (value as any).toDate();
  } else if (typeof (value as any)._seconds === 'number') {
    date = new Date((value as any)._seconds * 1000);
  } else if (typeof (value as any).seconds === 'number') {
    date = new Date((value as any).seconds * 1000);
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value);
  } else {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
