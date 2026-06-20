import React from 'react';
import './SectionHeader.css';

/**
 * Page / section heading with optional subtitle and action slot.
 *
 * @param {string}    title     - primary heading text
 * @param {string}    subtitle  - secondary description beneath the title
 * @param {ReactNode} action    - right-aligned content (buttons, filters, etc.)
 */
const SectionHeader = ({ title, subtitle, action }) => (
  <div className="section-hdr">
    <div className="section-hdr__text">
      <h2 className="section-hdr__title">{title}</h2>
      {subtitle && <p className="section-hdr__subtitle">{subtitle}</p>}
    </div>

    {action && <div className="section-hdr__action">{action}</div>}
  </div>
);

export default SectionHeader;
