import React from 'react';
import { FiInbox } from 'react-icons/fi';
import './EmptyState.css';

const EmptyState = ({
  icon: Icon = FiInbox,
  title       = 'No data found',
  description,
  action,
}) => (
  <div className="es">
    <div className="es__icon" aria-hidden="true">
      <Icon size={36} />
    </div>
    <p className="es__title">{title}</p>
    {description && <p className="es__desc">{description}</p>}
    {action && <div className="es__actions">{action}</div>}
  </div>
);

export default EmptyState;
