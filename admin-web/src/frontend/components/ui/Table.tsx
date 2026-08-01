import { useState, type ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  defaultSortKey?: string;
}

export function Table<T>({
  columns,
  rows,
  getRowKey,
  emptyTitle = 'Sin datos',
  emptyDescription,
  defaultSortKey,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const sortColumn = columns.find((column) => column.key === sortKey);
  const sortedRows = sortColumn?.sortValue
    ? [...rows].sort((a, b) => {
        const av = sortColumn.sortValue!(a);
        const bv = sortColumn.sortValue!(b);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : rows;

  function handleSort(column: TableColumn<T>) {
    if (!column.sortValue) return;
    if (sortKey === column.key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(column.key);
      setSortDir('asc');
    }
  }

  return (
    <div className="table-wrap">
      <table className="responsive-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.className}>
                {column.sortValue ? (
                  <button
                    type="button"
                    className="table-sort-btn"
                    onClick={() => handleSort(column)}
                    aria-label={`Ordenar por ${column.header}`}
                  >
                    {column.header}
                    {sortKey === column.key ? (
                      <span aria-hidden="true">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>
                    ) : null}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} data-label={column.header} className={column.className}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
