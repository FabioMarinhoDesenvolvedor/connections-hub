/*
  Facts that do not change with the language: name, address, channels, the order of the
  services and of the process. All copy lives in src/i18n (Portuguese is the source).
*/
export const site = {
  name: 'Connections Hub',
  url: 'https://www.connectionshub.com.br',
  contact: {
    whatsapp: 'https://wa.me/5511974589226',
    telephone: '+5511974589226',
    display: '(11) 97458-9226',
    email: 'contato@connectionshub.com.br',
  },
};

export const solutionIds = ['sites', 'sistemas', 'dashboards', 'ecommerce'] as const;
export type SolutionId = (typeof solutionIds)[number];

// Signature under the sticker in the closing (manual p.10 shows the symbol as a sticker).
export const credits = {
  name: 'Fabio Marinho',
  stack: 'Next.js · React · Three.js · WebGL2',
  href: 'https://github.com/FabioMarinhoDesenvolvedor',
  linkLabel: 'GitHub',
};
