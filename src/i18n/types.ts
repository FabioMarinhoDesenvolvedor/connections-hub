import type { FactId, InfraRole, LayerId, ProjectId, ProjectStatus } from '@/data/projects';
import type { SolutionId } from '@/data/site';

/*
  Every visible or announced string on the site, per language. The Portuguese is the
  source; the tagline is translated faithfully, never rewritten.
*/
export type VaultCopy = {
  file: string; policy: string; plain: string; cipher: string; encrypt: string; decrypt: string; again: string;
  area: string; hintDrag: string; hintTamper: string;
  status: { plain: string; encrypting: string; cipher: string; tampered: string; decrypting: string; rejected: string; restored: string; unavailable: string };
  key: string; iv: string;
  /** {a} → {b} */
  bytes: string;
  shape: string;
};
export type LiveCheckId = 'hsts' | 'csp' | 'frame' | 'nosniff' | 'permissions' | 'data';
export type LiveCopy = {
  label: string; note: string; ok: string; missing: string; configured: string;
  items: Record<LiveCheckId, { title: string; text: string }>;
  /** {cookies}, {third} */
  dataValue: string;
};

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
  hero: { eyebrow: string; lines: [string, string]; lead: string; primary: string; secondary: string; symbol: string };
  about: {
    label: string;
    title: string[];
    paragraphs: string[];
    facts: { term: string; detail: string }[];
    code: {
      label: string; title: string; intro: string; solves: string; project: string; language: string; tabs: string;
      files: { sla: string; backup: string; tokens: string; frete: string; ink: string };
      play: { keys: string; hold: string; holding: string; typed: string; chars: string; done: string; next: string; area: string };
    };
  };
  security: {
    label: string;
    title: string[];
    intro: string;
    vault: VaultCopy;
    live: LiveCopy;
    systemsLabel: string;
    systems: { title: string; text: string }[];
  };
  services: Record<SolutionId, { title: string; summary: string }>;
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
};
