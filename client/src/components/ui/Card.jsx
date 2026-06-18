import React from 'react';
import './Card.css';

/**
 * Base card surface.
 *
 * @param {ReactNode}      children
 * @param {string}         padding    - CSS value that overrides default padding (e.g. "1.5rem")
 * @param {boolean}        hoverable  - adds lift shadow on hover
 * @param {function}       onClick    - makes card clickable
 * @param {string}         className  - additional class names
 * @param {string}         as         - element to render (default: "div")
 */
const Card = ({
  children,
  padding,
  hoverable = false,
  onClick,
  className = '',
  as: Tag = 'div',
  ...rest
}) => {
  const classes = [
    'ui-card',
    hoverable ? 'ui-card--hoverable' : '',
    onClick ? 'ui-card--clickable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const style = padding ? { '--_card-padding': padding } : undefined;

  return (
    <Tag
      className={classes}
      onClick={onClick}
      style={style}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e); }
          : undefined
      }
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Card;
