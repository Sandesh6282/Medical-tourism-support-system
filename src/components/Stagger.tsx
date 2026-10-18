import React, { Children, isValidElement, cloneElement, useEffect, useState } from 'react';

interface StaggerProps {
  isVisible: boolean;
  children: React.ReactNode;
  delays?: number[];
  className?: string;
  style?: React.CSSProperties;
}

// Module-level shared motion preference listener to avoid duplicate media query listeners
let sharedReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;
const listeners = new Set<(reduced: boolean) => void>();

if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', (e) => {
    sharedReducedMotion = e.matches;
    listeners.forEach((fn) => fn(e.matches));
  });
}

export const Stagger: React.FC<StaggerProps> = ({
  isVisible,
  children,
  delays = [],
  className = '',
  style = {},
}) => {
  const [reducedMotion, setReducedMotion] = useState(sharedReducedMotion);

  useEffect(() => {
    const handler = (reduced: boolean) => setReducedMotion(reduced);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return (
    <div className={className} style={style}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;

        const delayMs = delays[index] !== undefined ? delays[index] : index * 100;
        const transitionStyle: React.CSSProperties = reducedMotion
          ? {
              opacity: isVisible ? 1 : 0,
            }
          : {
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
              transitionProperty: 'opacity, transform',
              transitionDuration: '0.6s',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              transitionDelay: `${delayMs}ms`,
            };

        // Merge styles safely
        const existingStyle = (child.props as { style?: React.CSSProperties })?.style || {};
        return cloneElement(child, {
          style: {
            ...existingStyle,
            ...transitionStyle,
          },
        } as React.HTMLAttributes<HTMLElement>);
      })}
    </div>
  );
};

export default Stagger;
