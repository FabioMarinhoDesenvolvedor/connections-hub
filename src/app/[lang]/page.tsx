import { notFound } from 'next/navigation';
import { ProjectGallery } from '@/components/project-gallery';
import { About } from '@/components/sections/about';
import { Contact } from '@/components/sections/contact';
import { Manifesto } from '@/components/sections/manifesto';
import { Process } from '@/components/sections/process';
import { Solutions } from '@/components/sections/solutions';
import { Story } from '@/components/story/story';
import { site, solutionIds } from '@/data/site';
import { getDictionary, isLocale, localeInfo } from '@/i18n';

export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, '');
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
    <Story t={t} />
    <About t={t.about} />
    <Solutions t={t.solutions} />
    <ProjectGallery t={t} />
    <Process t={t.process} />
    <Manifesto t={t.manifesto} />
    <Contact t={t} />
  </main>;
}
