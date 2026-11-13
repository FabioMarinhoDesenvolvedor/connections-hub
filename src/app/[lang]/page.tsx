import { notFound } from 'next/navigation';
import { Hero } from '@/components/hero/hero';
import { About } from '@/components/sections/about';
import { BlogLatest } from '@/components/sections/blog-latest';
import { Contact } from '@/components/sections/contact';
import { Monitor } from '@/components/sections/monitor';
import { Process } from '@/components/sections/process';
import { Projects } from '@/components/sections/projects';
import { Security } from '@/components/sections/security';
import { Solutions } from '@/components/sections/solutions';
import { site, siteOrigin, solutionIds } from '@/data/site';
import { getDictionary, isLocale, localeInfo } from '@/i18n';

export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const origin = siteOrigin();
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: origin + localeInfo[lang].path.replace(/^\/$/, ''),
    logo: `${origin}/brand/logo.svg`,
    description: t.meta.description,
    slogan: t.meta.tagline,
    email: site.contact.email,
    telephone: site.contact.telephone,
    inLanguage: localeInfo[lang].html,
    makesOffer: solutionIds.map(id => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: t.solutions.items[id].title, description: t.solutions.items[id].summary } })),
  };
  return <main id="conteudo">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <Hero t={t} />
    <About t={t.about} />
    <Security t={t.security} />
    <Solutions t={t.solutions} />
    <Monitor t={t.monitor} locale={localeInfo[lang].html} />
    <Projects t={t.projects} ui={t.ui} locale={localeInfo[lang].html} lang={lang} />
    <Process t={t.process} />
    <BlogLatest t={t.blog} locale={lang} />
    <Contact t={t} />
  </main>;
}
