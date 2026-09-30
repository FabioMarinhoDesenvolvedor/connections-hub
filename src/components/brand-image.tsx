const images = {
  'brand-office': [1536, 1024],
  'brand-people': [1536, 1024],
  'brand-technology': [1536, 1024],
} as const;

type BrandImageProps = {
  name: keyof typeof images;
  alt: string;
  className?: string;
  priority?: boolean;
};

// Official mockups, pre-optimised by scripts/prepare-assets.mjs.
export function BrandImage({ name, alt, className, priority = false }: BrandImageProps) {
  const [width, height] = images[name];
  return <picture className={className}>
    <source media="(max-width: 767px)" type="image/avif" srcSet={`/images/${name}-small.avif`} />
    <source media="(max-width: 767px)" type="image/webp" srcSet={`/images/${name}-small.webp`} />
    <source type="image/avif" srcSet={`/images/${name}.avif`} />
    <img src={`/images/${name}.webp`} alt={alt} width={width} height={height} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" />
  </picture>;
}
