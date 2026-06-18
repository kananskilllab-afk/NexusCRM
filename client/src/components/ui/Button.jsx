import React from 'react';
import './Button.css';

/**
 * Shared Button component.
 *
 * @param {string}    variant  - primary | secondary | ghost | danger
 * @param {string}    size     - sm | md | lg
 * @param {ReactNode} icon     - optional leading icon (hidden while loading)
 * @param {boolean}   loading  - shows spinner, disables interaction
 * @param {function}  onClick
 * @param {string}    type     - button type attribute (default: "button")
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  ...rest
}) => {
  const classes = [
    'ui-btn',
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    loading ? 'ui-btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="ui-btn__spinner" aria-hidden="true" />
      ) : (
        icon && <span className="ui-btn__icon" aria-hidden="true">{icon}</span>
      )}
      {children && <span className="ui-btn__label">{children}</span>}
    </button>
  );
};

export default Button;
