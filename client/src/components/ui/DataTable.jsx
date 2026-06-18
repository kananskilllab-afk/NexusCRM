import React, { memo } from 'react';
import './DataTable.css';

/**
 * Generic data table.
 *
 * @param {Array<{key, label, render}>} columns
 * @param {Array<object>}  data
 * @param {function}       onRowClick
 * @param {ReactNode}      emptyMessage  - shown when data is empty (accepts JSX)
 * @param {string}         maxHeight     - CSS value for scrollable wrapper
 * @param {string}         className
 * @param {boolean}        loading       - shows shimmer skeleton rows
 * @param {number}         skeletonRows  - number of skeleton rows (default 5)
 */
const DataTable = memo(({
  columns      = [],
  data         = [],
  onRowClick,
  emptyMessage = 'No records found.',
  maxHeight,
  className    = '',
  loading      = false,
  skeletonRows = 5,
}) => {
  const wrapperStyle = maxHeight ? { '--_dt-max-height': maxHeight } : undefined;

  return (
    <div className={`dt-outer ${className}`} style={wrapperStyle}>
      <table className="dt-table">
        <thead className="dt-head">
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col">{col.label}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            /* ── Skeleton rows ──────────────────────────── */
            Array.from({ length: skeletonRows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="dt-row" aria-hidden="true">
                {columns.map((col) => (
                  <td key={col.key}>
                    <span className="dt-skel" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            /* ── Empty state ────────────────────────────── */
            <tr>
              <td className="dt-empty" colSpan={columns.length || 1}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            /* ── Data rows ──────────────────────────────── */
            data.map((row, rowIdx) => (
              <tr
                key={row.id ?? rowIdx}
                className={`dt-row ${onRowClick ? 'dt-row--clickable' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => { if (e.key === 'Enter') onRowClick(row); }
                    : undefined
                }
              >
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render
                      ? col.render(row[col.key], row)
                      : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});

DataTable.displayName = 'DataTable';

export default DataTable;
