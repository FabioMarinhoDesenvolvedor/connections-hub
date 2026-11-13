import type { FactId, InfraRole, LayerId, ProjectId, ProjectStatus } from '@/data/projects';
import type { SolutionId } from '@/data/site';
import type { PostKind } from '@/lib/blog/posts';

/*
  Every visible or announced string on the site, per language. The Portuguese is the
  source; the tagline is translated faithfully, never rewritten.
*/
/** The Security demo: three short stories, each played on an ordinary site and then on ours. */
export type ShieldCopy = {
  modes: { open: string; safe: string };
  replay: string;
  area: string;
  address: string;
  insecure: string;
  wire: { you: string; wifi: string; spy: string; site: string; message: string; field: string; send: string; reads: string; sees: string; confused: string; received: string; open: string; safe: string };
  inject: { threats: [string, string, string]; effects: [string, string, string]; password: string; enter: string; blocked: string; count: string; open: string; safe: string };
  track: { trackers: [string, string, string]; profile: string; facts: [string, string, string, string]; empty: string; none: string; open: string; safe: string };
};

type Four = [string, string, string, string];
type Three = [string, string, string];
export type SolutionScenes = {
  sites: { domain: string; rank: string; cta: string; toast: string; toastText: string };
  sistemas: { files: Four; modules: Four; orders: string; rows: Three; statuses: Three; stockLabel: string; team: Three; shared: string; toast: string };
  dashboards: { title: string; period: string; unit: string; live: string; kpis: [{ label: string; prefix: string; value: number; suffix: string }, { label: string; prefix: string; value: number; suffix: string }, { label: string; prefix: string; value: number; suffix: string }]; trend: string; target: string; units: Four; act: string };
  ecommerce: { product: string; price: string; sizes: Three; add: string; shipping: string; shippingValue: string; total: string; totalValue: string; pay: string; paid: string; order: string; orderTime: string; stock: string; flow: [string, string, string, string, string, string] };
};

export type Dictionary = {
  meta: { title: string; description: string; tagline: string; socialAlt: string };
  /** The site footer, on every page. */
  footer: { statement: [string, string]; lead: string; site: string; solutions: string; contact: string; top: string; privacy: string; made: string; language: string };
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
  hero: { eyebrow: string; lines: [string, string]; lead: string; primary: string; secondary: string; index: string; symbol: string; colours: string; names: [string, string, string, string]; hint: string };
  about: {
    label: string;
    title: string[];
    paragraphs: string[];
    facts: [{ term: string; detail: string }, { term: string; detail: string }, { term: string; detail: string }, { term: string; detail: string }];
    /** The board (components/about/board.tsx): the rotating line and each fact's small scene. */
    board: {
      rotate: string; words: [string, string, string, string, string];
      links: [string, string, string, string];
      problem: string; solved: string; steps: [string, string, string, string];
      you: string; dev: string; ask: string; answer: string; direct: string;
    };
  };
  security: {
    label: string;
    title: string[];
    lead: string;
    shield: ShieldCopy;
    pillars: [{ title: string; text: string }, { title: string; text: string }, { title: string; text: string }];
  };
  solutions: {
    label: string;
    title: string[];
    intro: string;
    solvesLabel: string;
    includesLabel: string;
    replay: string;
    items: Record<SolutionId, {
      title: string;
      summary: string;
      solves: string;
      result: string;
      cta: string;
      includes: string[];
    }>;
    /** What each scene shows: first the problem, then the solution (components/solutions/stage.tsx). */
    scenes: SolutionScenes;
  };
  process: {
    label: string;
    title: string[];
    intro: string;
    outcomeLabel: string;
    steps: { title: string; text: string; outcome: string }[];
    /** The journey (components/process/journey.tsx): one example project told through the four steps. */
    journey: {
      label: string; prev: string; next: string; pause: string; play: string;
      toasts: [string, string, string, string];
      understand: { call: string; you: string; us: string; said: [string, string]; board: string; notes: [string, string, string]; doc: string; docLines: [string, string, string] };
      plan: { title: string; must: string; later: string; items: [string, string, string]; timeline: string; phases: [string, string, string]; why: string };
      build: { versions: [string, string, string]; comment: string; done: string; title: string; slots: [string, string, string] };
      launch: { live: string; agenda: string; bookings: [string, string, string, string]; checks: [string, string]; ask: string; answer: string };
    };
  };
  contact: {
    label: string;
    title: string;
    lead: string;
    channels: string;
    whatsapp: string;
    email: string;
    phone: string;
    /** The message builder: it only composes; the visitor's own WhatsApp or e-mail sends it. */
    form: {
      need: string; kinds: [string, string, string, string, string]; topics: [string, string, string, string];
      about: string; placeholder: string; name: string; optional: string; preview: string;
      hello: string; helloNamed: string; want: string; unsure: string; whatsapp: string; email: string; subject: string; note: string;
    };
  };
  sticker: { peel: string; hint: string; found: string; role: string; back: string };
  /** Launch news: the hero pill and the "Novidades" menu item, fed by blog posts of kind "anuncio". */
  news: { nav: string; pill: string; pillLabel: string; fresh: string };
  /** HubMonitor preview (components/sections/monitor.tsx). {n}, {time} and {name} are filled in. */
  monitor: {
    nav: string;
    label: string;
    title: string[];
    intro: string;
    open: string;
    note: string;
    windowLabel: string;
    read: string;
    state: { clear: string; impactOne: string; impact: string; partial_data: string; no_data: string };
    status: { operational: string; no_incident: string; maintenance: string; degraded: string; partial_outage: string; major_outage: string; unknown: string };
    stale: string;
    axis: { start: string; now: string };
    stripLabel: string;
    caption: string;
  };
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
    /** The plain-language view: who it is for, the challenge, what was built, what each action did. */
    story: { for: string; challenge: string; built: string; happened: string; idle: string };
    /** The glass showcase (components/projects/showcase.tsx). */
    showcase: { of: string; next: string; inside: string; watch: string; stop: string; close: string };
    /** Each layer in plain words, for the tags and the panel (the technical name follows). */
    plain: Record<LayerId, string>;
    items: Record<ProjectId, {
      kind: string; summary: string; try: string; layers: Record<LayerId, string>; tech: Record<string, string>; steps: string[];
      story: { for: string; challenge: string; built: string[] };
      /** What each action of the live interface did, keyed by its flow. */
      effects: Record<string, string>;
    }>;
  };
  /** {email} in text: the contact address, filled from data/site.ts. */
  privacy: { label: string; text: string; dismiss: string };
  console: { signature: string };
  /** Interface of the blog; the posts themselves are Markdown in content/blog. */
  blog: {
    nav: string;
    meta: { title: string; description: string; announcements: string; tag: string };
    label: string;
    title: string[];
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
