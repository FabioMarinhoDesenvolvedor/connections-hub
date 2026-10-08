// Manual p.8 diagram: seed → opening → meeting point → the hub. Used when the story is
// laid out statically (no JavaScript, reduced motion, short screens). The last state is
// the official logo file, cropped to its symbol by the container, never redrawn.
export function ConceptFigure({ state }: { state: number }) {
  if (state === 3) return <span className="concept-figure concept-figure-symbol" aria-hidden="true">
    <img src="/brand/logo.svg" width="1408" height="311" alt="" loading="lazy" />
  </span>;
  return <svg className="concept-figure" viewBox="0 0 100 100" aria-hidden="true">
    {state === 0 && <circle cx="50" cy="50" r="46.7" fill="var(--navy)" />}
    {state === 1 && <circle cx="50" cy="50" r="39.5" fill="none" stroke="var(--navy)" strokeWidth="14.5" />}
    {state === 2 && <>
      <path d="M81.1 25.7A39.5 39.5 0 1 0 77.9 77.9" fill="none" stroke="var(--navy)" strokeWidth="14.5" strokeLinecap="round" />
      <circle cx="90.9" cy="60.8" r="7.3" fill="var(--navy)" />
    </>}
  </svg>;
}
