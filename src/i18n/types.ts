import type { FactId, InfraRole, LayerId, ProjectId, ProjectStatus } from '@/data/projects';
import type { SolutionId } from '@/data/site';
import type { PostKind } from '@/lib/blog/posts';

/*
  Every visible or announced string on the site, per language. The Portuguese is the
  source; the tagline is translated faithfully, never rewritten.
*/
export type VaultCopy = { protect: string; again: string; code: string; sealed: string; area: string };

export type Dictionary = {
  meta: { title: string; description: string; tagline: string; socialAlt: string };
  ui: {
    skip: string;
    home: string;
    mainNav: string;
    mobileNav: string;
    footerNav: string;
    openMenu: string;
    closeMenu: string;
    contactShort: string;
    newTab: string;
    github: string;
    language: string;
    theme: { label: string; toDark: string; toLight: string };
  };
  nav: { label: string; href: string }[];
  hero: { eyebrow: string; lines: [string, string]; lead: string; primary: string; secondary: string; index: string; symbol: string };
  about: {
    label: string;
    title: string[];
    paragraphs: string[];
    facts: { term: string; detail: string }[];
  };
  security: {
    label: string;
    title: string[];
    lead: string;
    vault: VaultCopy;
    pillars: { title: string; text: string }[];
  };
  solutions: {
    label: string;
    title: string[];
    intro: string;
    figure: string;
    solvesLabel: string;
    includesLabel: string;
    items: Record<SolutionId, {
      title: string;
      summary: string;
      solves: string;
      cta: string;
      figure: { title: string; caption: string };
      includes: string[];
    }>;
    schematic: {
      sites: { nav: string; hero: string; sections: string; contact: string };
      sistemas: { modules: [string, string, string, string]; profiles: string; database: string; sheets: string; reports: string; integration: string };
      dashboards: { sources: [string, string, string]; processing: string; period: string; unit: string; target: string; decision: string };
      ecommerce: { flow: [string, string, string, string, string, string]; add: string; checkout: string; payment: string; shipping: string; total: string; finish: string };
    };
  };
  process: {
    label: string;
    title: string[];
    intro: string;
    outcomeLabel: string;
    steps: { title: string; text: string; outcome: string }[];
  };
  contact: {
    label: string;
    title: string;
    lead: string;
    channels: string;
    whatsapp: string;
    email: string;
    phone: string;
  };
  sticker: { peel: string; found: string; role: string; back: string };
  projects: {
    label: string;
    title: string[];
    intro: string;
    status: Record<ProjectStatus, string>;
    /** Client line for the studio's own products. */
    own: string;
    tabs: string;
    layers: Record<LayerId, string>;
    facts: Record<FactId, string>;
    hint: string;
    tryLabel: string;
    front: string;
    back: string;
    reset: string;
    trace: string;
    traceIdle: string;
    /** {n} */
    more: string;
    stackLabel: string;
    roles: Record<InfraRole, string>;
    /** {n} */
    routes: string;
    /** {n} */
    columns: string;
    response: string;
    clickNode: string;
    play: { start: string; pause: string; resume: string; again: string; label: string; step: string };
    inspect: { request: string; service: string; data: string; effect: string; response: string };
    /** {date} */
    since: string;
    /** {v} */
    version: string;
    repo: string;
    download: { label: string; note: string; releases: string; disclaimer: { label: string; test: string; privacy: string } };
    privateRepo: string;
    /** Private code of the studio's own products. */
    privateOwn: string;
    github: string;
    note: string;
    items: Record<ProjectId, { kind: string; summary: string; try: string; layers: Record<LayerId, string>; tech: Record<string, string>; steps: string[] }>;
  };
  privacy: { label: string; text: string; dismiss: string };
  console: { signature: string };
  /** Interface of the blog; the posts themselves are Markdown in content/blog. */
  blog: {
    nav: string;
    meta: { title: string; description: string; announcements: string; tag: string };
    label: string;
    title: string[];
    intro: string;
    announcements: { label: string; title: string[]; intro: string };
    /** {tag} */
    tagTitle: string;
    kinds: Record<PostKind, string>;
    all: string;
    tags: string;
    rss: string;
    /** {n}, singular and plural */
    count: { one: string; other: string };
    toc: string;
    top: string;
    tldr: string;
    /** {n} */
    minutes: string;
    /** {date} */
    updated: string;
    by: string;
    back: string;
    newer: string;
    older: string;
    draft: string;
    empty: string;
    /** Shown in English and Japanese while there are no translations yet. */
    emptyLanguage: string;
    readOriginal: string;
    alsoIn: string;
    /** The e-mail alternative under the comments. {title} in subject. */
    reply: { prefer: string; email: string; subject: string };
    comments: {
      title: string;
      intro: string;
      /** {n}, singular and plural */
      count: { one: string; other: string };
      empty: string;
      loading: string;
      unavailable: string;
      noscript: string;
      form: { title: string; name: string; email: string; body: string; send: string; /** {email} */ note: string };
      sent: string;
      errors: { invalido: string; limite: string; indisponivel: string };
    };
    latest: { label: string; title: string[]; all: string };
  };
};
