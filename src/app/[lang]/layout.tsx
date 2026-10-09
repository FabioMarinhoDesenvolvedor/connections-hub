import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import { site } from '@/data/site';
import { getDictionary, isLocale, localeInfo, locales } from '@/i18n';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { ScrollEffects } from '@/components/scroll-effects';
import { ConsoleGreeting } from '@/components/console-greeting';
import '../globals.css';

const satoshi = localFont({
  src: '../../../public/fonts/Satoshi-Variable.woff2',
  variable: '--font-satoshi',
  display: 'swap',
  weight: '300 900',
  style: 'normal',
  fallback: ['Arial', 'sans-serif'],
});

export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map(lang => ({ lang }));
}

const origin = (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, '');

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  const info = localeInfo[lang];
  return {
    metadataBase: new URL(origin),
    title: t.meta.title,
    description: t.meta.description,
    applicationName: site.name,
    alternates: {
      canonical: info.path,
      languages: { ...Object.fromEntries(locales.map(l => [localeInfo[l].html, localeInfo[l].path])), 'x-default': '/' },
    },
    openGraph: {
      type: 'website', locale: info.og, alternateLocale: locales.filter(l => l !== lang).map(l => localeInfo[l].og),
      siteName: site.name, title: `${site.name} — ${t.meta.tagline}`, description: t.meta.description, url: info.path,
      images: [{ url: '/images/social.jpg', width: 1200, height: 630, alt: t.meta.socialAlt }],
    },
    twitter: { card: 'summary_large_image', title: site.name, description: t.meta.description, images: ['/images/social.jpg'] },
    icons: { icon: '/favicon.png' },
  };
}

// The browser bar follows the page: off-white in the light theme, ink in the dark one.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F6F0' },
    { media: '(prefers-color-scheme: dark)', color: '#20252B' },
  ],
};

/*
  Runs before first paint:
  - the pinned story layout applies only when JavaScript will drive it (.js);
  - the theme is the visitor's saved choice, else the system's, so there is no flash of the
    wrong theme. Storage can be unavailable (private mode); then the system decides.
*/
const boot = `(function(){var d=document.documentElement,t;d.classList.add('js');try{t=localStorage.getItem('theme')}catch(e){}if(t!=='light'&&t!=='dark')t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.dataset.theme=t;d.style.colorScheme=t;})()`;

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  return <html lang={localeInfo[lang].html} className={satoshi.variable} suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{ __html: boot }} />
    </head>
    <body>
      <a className="skip-link" href="#conteudo">{t.ui.skip}</a>
      <Navigation locale={lang} t={{ ui: t.ui, nav: t.nav }} />
      {children}
      <Footer t={t} />
      <ScrollEffects />
      <ConsoleGreeting locale={lang} signature={t.console.signature} />
    </body>
  </html>;
}
