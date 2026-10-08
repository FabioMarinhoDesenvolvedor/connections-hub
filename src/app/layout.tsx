import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { site } from '@/data/site';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { ScrollEffects } from '@/components/scroll-effects';
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || site.url),
  title: 'Connections Hub — Sites, sistemas, dashboards e e-commerces sob medida',
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website', locale: 'pt_BR', siteName: site.name, title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: [{ url: '/images/social.jpg', width: 1200, height: 630, alt: 'Identidade visual Connections Hub' }],
  },
  twitter: { card: 'summary_large_image', title: site.name, description: site.description, images: ['/images/social.jpg'] },
  icons: { icon: '/favicon.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#F8F6F0' };

// Runs before first paint: the pinned story layout applies only when JavaScript will drive it,
// so neither no-JS visitors nor hydration see a layout change.
const enhance = "document.documentElement.classList.add('js')";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={satoshi.variable} suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{ __html: enhance }} />
    </head>
    <body>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <Navigation />
      {children}
      <Footer />
      <ScrollEffects />
    </body>
  </html>;
}
