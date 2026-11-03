import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '../globals.css';

/*
  The owner's moderation panel. Its own root layout (outside the languages): Portuguese only,
  never indexed, no navigation of the public site.
*/
const satoshi = localFont({ src: '../../../public/fonts/Satoshi-Variable.woff2', variable: '--font-satoshi', display: 'swap', weight: '300 900', fallback: ['Arial', 'sans-serif'] });

export const metadata: Metadata = {
  title: 'Moderação — Connections Hub',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.png' },
};

const boot = `(function(){var d=document.documentElement,t;try{t=localStorage.getItem('theme')}catch(e){}if(t!=='light'&&t!=='dark')t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.dataset.theme=t;d.style.colorScheme=t;})()`;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR" className={satoshi.variable} suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: boot }} /></head>
    <body>{children}</body>
  </html>;
}
