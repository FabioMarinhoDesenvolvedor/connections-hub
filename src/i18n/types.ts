import type { FactId, InfraRole, LayerId, ProjectId, ProjectStatus } from '@/data/projects';
import type { SolutionId } from '@/data/site';

/*
  Every visible or announced string on the site, per language. Brand texts (manual p.8
  concept, p.9 values, p.10 manifesto, p.11 tagline) are translated faithfully, never
  rewritten; the Portuguese is the source.
*/
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
    theme: { label: string; toDark: string; toLight: string; pull: string };
  };
  nav: { label: string; href: string }[];
  hero: { eyebrow: string; lines: [string, string]; lead: string; primary: string; secondary: string; index: string };
  concept: {
    label: string;
    chapters: [string, string, string, string];
    lockupLine: string;
    cue: string;
    secret: { title: string; hint: string };
  };
  about: {
    label: string;
    title: string[];
    paragraphs: string[];
    facts: { term: string; detail: string }[];
    imageAlt: string;
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
  manifesto: {
    label: string;
    signature: { text: string; bold: boolean }[];
    signatureAria: string;
    opening: string;
    paragraphs: string[];
    valuesLabel: string;
    valuesAria: string;
    values: string[];
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
    privateRepo: string;
    github: string;
    note: string;
    items: Record<ProjectId, { kind: string; summary: string; try: string; layers: Record<LayerId, string>; tech: Record<string, string>; steps: string[] }>;
  };
  console: { signature: string };
};
