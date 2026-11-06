import { github } from '@/data/projects';
import { site, solutionIds } from '@/data/site';
import { GithubMark } from './github-mark';
import { localeInfo, localePath, locales, type Dictionary, type Locale } from '@/i18n';

/*
  The end of every page, on the closing's navy. The brand's tagline as a statement with the
  way back to the top; four short columns (the site, the solutions, the contacts, the
  language); the official light logo at full width, revealed as the page ends (scaled, never
  distorted); and the essentials. Links name the home page so they also work from the blog
  (AnchorJump still treats them as in-page on the home).
*/
export function Footer({ t, locale }: { t: Dictionary; locale: Locale }) {
  const home = localeInfo[locale].path;
  const f = t.footer;
  const [user, domain] = site.contact.email.split('@');
  return <footer className="site-footer" data-nav-theme="dark">
    <div className="shell footer-top">
      <div className="footer-statement" data-reveal>
        <p className="footer-title"><span>{f.statement[0]}</span><span>{f.statement[1]}</span></p>
        <p className="footer-lead">{f.lead}</p>
      </div>
      <a className="footer-up" href={`${home}#inicio`}>
        <span className="footer-up-ring" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15.5v-11M5 9l5-5 5 5" /></svg>
        </span>
        {f.top}
      </a>
    </div>

    <div className="shell footer-columns">
      <nav aria-label={t.ui.footerNav} className="footer-col">
        <p className="footer-col-title">{f.site}</p>
        <ul>
          {t.nav.map(item => <li key={item.href}><a href={`${home}${item.href}`}>{item.label}</a></li>)}
          <li><a href={localePath(locale, '/blog')}>{t.blog.nav}</a></li>
        </ul>
      </nav>
      <div className="footer-col">
        <p className="footer-col-title">{f.solutions}</p>
        <ul>{solutionIds.map(id => <li key={id}><a href={`${home}#solucao-${id}`}>{t.solutions.items[id].title}</a></li>)}</ul>
      </div>
      <div className="footer-col">
        <p className="footer-col-title">{f.contact}</p>
        <ul>
          <li><a href={site.contact.whatsapp} target="_blank" rel="noopener noreferrer">{t.contact.whatsapp}<span className="sr-only"> {t.ui.newTab}</span></a></li>
          <li><a href={`mailto:${site.contact.email}`}>{user}<wbr />@{domain}</a></li>
          <li><a href={`tel:${site.contact.telephone}`}>{site.contact.display}</a></li>
          <li><a className="footer-github" href={github} target="_blank" rel="noopener noreferrer"><GithubMark size={15} />GitHub<span className="sr-only"> {t.ui.newTab}</span></a></li>
        </ul>
      </div>
      <div className="footer-col">
        <p className="footer-col-title">{f.language}</p>
        <ul className="footer-langs">
          {locales.map(l => <li key={l}><a href={localePath(l, '/')} hrefLang={localeInfo[l].html} lang={localeInfo[l].html} aria-current={l === locale ? 'true' : undefined}>{localeInfo[l].label}</a></li>)}
        </ul>
      </div>
    </div>

    <div className="shell footer-mark" data-reveal aria-hidden="true">
      <img src="/brand/logo-light.svg" width="1408" height="311" alt="" loading="lazy" />
    </div>

    <div className="shell footer-bottom">
      <p>© {new Date().getFullYear()} {site.name}</p>
      <p className="footer-privacy"><span className="point" aria-hidden="true" />{f.privacy}</p>
      <p>{f.made}</p>
    </div>
  </footer>;
}
