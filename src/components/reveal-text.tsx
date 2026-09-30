import type { CSSProperties, ElementType } from 'react';

type RevealTextProps = { text: string; as?: ElementType; className?: string; id?: string; start?: number; end?: number };

// Words brighten as the paragraph crosses the viewport (driven by ScrollEffects).
// The text is plain HTML: readable, selectable and indexable without JavaScript.
export function RevealText({ text, as: Tag = 'p', className, id, start = 0.85, end = 0.55 }: RevealTextProps) {
  const words = text.split(' ');
  return <Tag id={id} className={`reveal-text ${className ?? ''}`} data-progress data-start={start} data-end={end} style={{ '--n': words.length } as CSSProperties}>
    {words.map((word, index) => <span key={index} style={{ '--i': index } as CSSProperties}>{word}{index < words.length - 1 ? ' ' : ''}</span>)}
  </Tag>;
}
