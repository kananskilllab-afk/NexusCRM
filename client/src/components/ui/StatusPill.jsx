import React from 'react';
import './StatusPill.css';

/**
 * Maps a status string to one of the kanan brand CSS variable names.
 * The variable name is injected as --_pill-color on the element so the
 * CSS can use it for both text colour and the 15% opacity background
 * via color-mix() — no hardcoded hex anywhere.
 */
const STATUS_COLOR_MAP = {
  // ── Green: confirmed / successful states ──────────────────────────────
  confirmed:  '--kanan-green',
  paid:       '--kanan-green',
  qualified:  '--kanan-green',
  booked:     '--kanan-green',
  active:     '--kanan-green',

  // ── Sky: in-progress / sent states ───────────────────────────────────
  quoted:     '--kanan-sky',
  sent:       '--kanan-sky',
  pending:    '--kanan-sky',
  working:    '--kanan-sky',
  processing: '--kanan-sky',

  // ── Orange: negotiation / partial states ─────────────────────────────
  negotiation: '--kanan-orange',
  negotiating: '--kanan-orange',
  partial:     '--kanan-orange',
  'proposal-sent': '--kanan-orange',

  // ── Red: overdue / negative states ───────────────────────────────────
  overdue:     '--kanan-red',
  unqualified: '--kanan-red',
  lost:        '--kanan-red',
  cancelled:   '--kanan-red',
  hot:         '--kanan-red',

  // ── Muted: neutral / draft states ────────────────────────────────────
  new:   '--text-muted',
  draft: '--text-muted',
  cold:  '--text-muted',
};

const DEFAULT_COLOR = '--text-muted';

/**
 * StatusPill — inline badge that auto-colours from the brand palette.
 *
 * @param {string} status - any status string; falls back to muted if unmapped
 * @param {string} size   - sm | md (default)
 * @param {string} label  - override display text (defaults to status value)
 */
const StatusPill = ({ status = '', size = 'md', label }) => {
  const key = status.toLowerCase().trim();
  const colorVar = STATUS_COLOR_MAP[key] ?? DEFAULT_COLOR;

  const classes = ['status-pill', `status-pill--${size}`].join(' ');

  return (
    <span
      className={classes}
      style={{ '--_pill-color': `var(${colorVar})` }}
      title={status}
    >
      <span className="status-pill__dot" aria-hidden="true" />
      {label ?? status}
    </span>
  );
};

export default StatusPill;
