import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { site } from '@/data/site';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { ScrollEffects } from '@/components/scroll-effects';
import { SmoothScroll } from '@/components/smooth-scroll';
import './globals.css';

const satoshi = localFont({
  src: '../../public/fonts/Satoshi-Variable.woff2',
  variable: '--font-satoshi',
  display: 'swap',
  weight: '300 900',
  style: 'normal',
  fallback: ['Arial', 'sans-serif'],
});
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Connections Hub — Conectando ideias. Construindo soluções.',
  description: site.description,
  applicationName: site.name,
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { alternates: { canonical: '/' } } : {}),
  openGraph: {
    type: 'website', locale: 'pt_BR', siteName: site.name, title: site.tagline,
    description: site.description,
    images: [{ url: '/images/social.jpg', width: 1200, height: 630, alt: 'Aplicação institucional da marca Connections Hub' }],
  },
  twitter: { card: 'summary_large_image', title: site.name, description: site.description, images: ['/images/social.jpg'] },
  icons: { icon: '/favicon.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#F8F6F0' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={satoshi.variable}>
    <body>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <Navigation />
      {children}
      <Footer />
      <ScrollEffects />
      <SmoothScroll />
    </body>
  </html>;
}
