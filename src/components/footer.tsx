import { github } from '@/data/projects';
import { site } from '@/data/site';
import { GithubMark } from './github-mark';
import { localeInfo, localePath, type Dictionary, type Locale } from '@/i18n';

// Continues the closing section on the same surface: the official light logo, the way back
// into the page, and the essentials. Nothing repeated from above. Links name the home page
// so they also work from the blog (AnchorJump still treats them as in-page on the home).
export function Footer({ t, locale }: { t: Dictionary; locale: Locale }) {
  const home = localeInfo[locale].path;
  return <footer className="site-footer" data-nav-theme="dark">
    <div className="shell footer-row">
      <a href={`${home}#inicio`} className="footer-logo" aria-label={t.ui.home}>
        <img src="/brand/logo-light.svg" width="1408" height="311" alt="" loading="lazy" />
      </a>
      <nav aria-label={t.ui.footerNav} className="footer-nav">
        {t.nav.map(item => <a key={item.href} href={`${home}${item.href}`}>{item.label}</a>)}
        <a href={localePath(locale, '/blog')}>{t.blog.nav}</a>
        <a className="footer-github" href={github} target="_blank" rel="noopener noreferrer"><GithubMark size={16} />GitHub<span className="sr-only"> {t.ui.newTab}</span></a>
      </nav>
      <p className="footer-legal">© {new Date().getFullYear()} {site.name} · {t.meta.tagline}</p>
    </div>
  </footer>;
}
