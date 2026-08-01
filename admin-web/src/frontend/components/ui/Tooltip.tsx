import { cloneElement, useId, type ReactElement } from 'react';

interface TooltipableProps {
  'aria-describedby'?: string;
}

interface TooltipProps {
  content: string;
  children: ReactElement<TooltipableProps>;
}

/** Envuelve un solo elemento enfocable/hoverable. Visible con mouse Y con teclado (:focus-within). */
export function Tooltip({ content, children }: TooltipProps) {
  const id = useId();
  return (
    <span className="tooltip-wrap">
      {cloneElement(children, { 'aria-describedby': id })}
      <span role="tooltip" id={id} className="tooltip-bubble">
        {content}
      </span>
    </span>
  );
}
