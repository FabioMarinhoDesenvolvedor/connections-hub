import type { ReactNode } from 'react';

/*
  Every section opens the same way: a short label,
  a title revealed line by line, and an optional intro. Titles are passed as lines so the
  mask reveal follows the authored breaks rather than wherever the browser wraps.
*/
export function SectionHead({ label, id, lines, intro, className = '' }: {
  label: string;
  id: string;
  lines: string[];
  intro?: ReactNode;
  className?: string;
}) {
  return <header className={`section-head ${className}`}>
    <p className="label" data-reveal>{label}</p>
    <h2 id={id} className="section-title" data-reveal="lines">
      {lines.map(line => <span className="line" key={line}><span>{line}</span></span>)}
    </h2>
    {intro && <p className="section-intro" data-reveal>{intro}</p>}
  </header>;
}
