import { ProjectGallery } from '@/components/project-gallery';
import { About } from '@/components/sections/about';
import { Contact } from '@/components/sections/contact';
import { Manifesto } from '@/components/sections/manifesto';
import { Process } from '@/components/sections/process';
import { Solutions } from '@/components/sections/solutions';
import { Story } from '@/components/story/story';
import { site, solutions } from '@/data/site';

export default function Home() {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, '');
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: origin,
    logo: `${origin}/brand/logo.svg`,
    description: site.description,
    slogan: site.tagline,
    email: site.contact.email,
    telephone: site.contact.telephone,
    makesOffer: solutions.map(item => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: item.title, description: item.summary } })),
  };
  return <main id="conteudo">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <Story />
    <About />
    <Solutions />
    <ProjectGallery />
    <Process />
    <Manifesto />
    <Contact />
  </main>;
}
