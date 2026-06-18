import React, { useEffect, useState, memo } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';
import './Toast.css';

const ICON_MAP = {
  success: FiCheckCircle,
  error:   FiAlertCircle,
  info:    FiInfo,
};

export const ToastItem = memo(({ id, message, type = 'info', onRemove }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const Icon = ICON_MAP[type] ?? FiInfo;

  return (
    <div
      className={`toast toast--${type}${visible ? ' toast--visible' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <span className="toast__icon" aria-hidden="true"><Icon size={15} /></span>
      <span className="toast__message">{message}</span>
      <button
        className="toast__close"
        onClick={() => onRemove(id)}
        aria-label="Dismiss notification"
      >
        <FiX size={13} />
      </button>
    </div>
  );
});

ToastItem.displayName = 'ToastItem';

export const ToastContainer = ({ toasts = [], onRemove }) => {
  if (!toasts.length) return null;
  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} onRemove={onRemove} />
      ))}
    </div>
  );
};
