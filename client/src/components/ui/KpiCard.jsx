import React, { memo } from 'react';
import './KpiCard.css';

/**
 * KPI stat card.
 *
 * @param {string}         label        - metric name
 * @param {string|number}  value        - formatted value to display (e.g. "₹4.2L")
 * @param {number}         change       - % change; positive=up, negative=down, omit for none
 * @param {ReactNode}      icon         - icon shown in accent-coloured box
 * @param {string}         accentColor  - CSS color value (default: var(--kanan-blue))
 * @param {function}       onClick      - optional click handler
 */
const KpiCard = memo(({
  label,
  value,
  change,
  icon,
  accentColor = 'var(--kanan-blue)',
  onClick,
  className = '',
}) => {
  const hasChange = change !== undefined && change !== null;
  const isUp      = hasChange && change > 0;
  const isDown    = hasChange && change < 0;
  const absChange = hasChange ? Math.abs(change) : 0;

  const changeClass = isUp
    ? 'kpi-card__change--up'
    : isDown
    ? 'kpi-card__change--down'
    : 'kpi-card__change--neutral';

  const arrow = isUp ? '▲' : isDown ? '▼' : '●';

  const classes = [
    'kpi-card',
    onClick ? 'kpi-card--clickable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      onClick={onClick}
      style={{ '--_accent': accentColor }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {icon && (
        <div className="kpi-card__icon-wrap" aria-hidden="true">
          {icon}
        </div>
      )}

      <div className="kpi-card__body">
        <p className="kpi-card__label">{label}</p>
        <p className="kpi-card__value">{value}</p>

        {hasChange && (
          <span className={`kpi-card__change ${changeClass}`}>
            <span className="kpi-card__arrow" aria-hidden="true">{arrow}</span>
            {absChange % 1 === 0
              ? `${absChange}%`
              : `${absChange.toFixed(1)}%`}
          </span>
        )}
      </div>
    </div>
  );
});

KpiCard.displayName = 'KpiCard';

export default KpiCard;
