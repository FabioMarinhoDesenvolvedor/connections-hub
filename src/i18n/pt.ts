import type { Dictionary } from './types';

/*
  Source language. Sources: brand manual (p.8 concept, p.9 values, p.10 manifesto, p.11
  tagline), initial posts (positioning, process names, contact story) and the Instagram bio.
  No clients, metrics, team size or results are invented. Service scopes describe what a
  project *can* include; they are not claims about past work.
*/
export const pt: Dictionary = {
  meta: {
    title: 'Connections Hub — Sites, sistemas, dashboards e e-commerces sob medida',
    description: 'A Connections Hub desenvolve sites, sistemas e ERP, dashboards e e-commerces sob medida, do entendimento da operação à implantação.',
    tagline: 'Conectando ideias. Construindo soluções.',
    socialAlt: 'Identidade visual Connections Hub',
  },
  ui: {
    skip: 'Pular para o conteúdo',
    home: 'Connections Hub, início',
    mainNav: 'Navegação principal',
    mobileNav: 'Navegação móvel',
    footerNav: 'Navegação do rodapé',
    openMenu: 'Abrir menu',
    closeMenu: 'Fechar menu',
    contactShort: 'Fale conosco',
    newTab: '(abre em uma nova aba)',
    language: 'Idioma',
    theme: { label: 'Tema', toDark: 'Usar tema escuro', toLight: 'Usar tema claro' },
  },
  nav: [
    { label: 'Sobre', href: '#sobre' },
    { label: 'Soluções', href: '#solucoes' },
    { label: 'Processo', href: '#processo' },
    { label: 'Manifesto', href: '#manifesto' },
  ],
  hero: {
    eyebrow: 'Desenvolvimento de software sob medida',
    lines: ['Conectando ideias.', 'Construindo soluções.'],
    lead: 'Sites, sistemas e ERP, dashboards e e-commerces pensados para a realidade de cada negócio, do planejamento à implantação.',
    primary: 'Fale sobre seu projeto',
    secondary: 'Ver soluções',
    index: 'Soluções',
  },
  // Manual p.8, verbatim. The fourth line is the brand's own definition of the company.
  concept: {
    label: 'O conceito da marca',
    chapters: [
      'A semente de uma ideia.',
      'Ao abrir, se torna uma possibilidade de conexão.',
      'Mas ela ainda precisa de um ponto de encontro.',
      'A Connections Hub é o ponto central que reúne clientes aos melhores serviços.',
    ],
    lockupLine: 'Pessoas. Ideias. Tecnologia.',
    cue: 'Role para conhecer o conceito',
    secret: { title: 'Você abriu a semente antes da hora', hint: 'Role para ver a história inteira.' },
  },
  about: {
    label: 'Sobre',
    title: ['Tecnologia só faz sentido', 'quando resolve alguma coisa.'],
    paragraphs: [
      'A Connections Hub é o ponto de encontro entre quem tem uma necessidade e a solução tecnológica que vai atendê-la. Começamos pelo seu trabalho: o que a empresa faz, onde a operação trava e o que precisa mudar. Só então decidimos o que construir.',
      'Nem todo negócio precisa da mesma tecnologia. Cada projeto é definido a partir da necessidade, para que a tecnologia se adapte ao negócio, e não o contrário.',
    ],
    facts: [
      { term: 'Construímos', detail: 'Sites, sistemas e ERP, dashboards e e-commerces.' },
      { term: 'Para', detail: 'Empresas, profissionais e pessoas com uma necessidade concreta.' },
      { term: 'Do', detail: 'Planejamento à implantação, em etapas que você acompanha.' },
      { term: 'Com', detail: 'Atendimento personalizado e o conhecimento técnico como base de cada decisão.' },
    ],
    imageAlt: 'Mockup de marca: ambiente de trabalho com a identidade Connections Hub nas paredes.',
  },
  solutions: {
    label: 'Soluções',
    title: ['Do problema', 'à solução.'],
    intro: 'Quatro frentes de trabalho, definidas com você a partir do que a operação precisa. Um mesmo projeto pode combinar mais de uma.',
    figure: 'Fig.',
    solvesLabel: 'Resolve',
    includesLabel: 'Pode incluir',
    items: {
      sites: {
        title: 'Sites',
        summary: 'Presença institucional que explica com clareza o que a sua empresa faz e facilita o primeiro contato.',
        solves: 'Empresas difíceis de encontrar, ou encontradas sem conseguir mostrar o que oferecem.',
        cta: 'Conversar sobre sites',
        figure: { title: 'Composição de front-end', caption: 'Um layout, todas as telas: os mesmos componentes reorganizados do desktop ao celular, com o contato sempre à mão.' },
        includes: ['Site institucional e páginas de serviço', 'Estrutura e conteúdo preparados para buscadores', 'Formulários e contato direto pelo WhatsApp', 'Gerenciamento de conteúdo', 'Publicação, domínio e métricas de acesso'],
      },
      sistemas: {
        title: 'Sistemas e ERP',
        summary: 'Software para os processos internos que a operação usa todos os dias: cadastros, pedidos, estoque, financeiro.',
        solves: 'Processos espalhados em planilhas, retrabalho e informações que dependem de uma única pessoa.',
        cta: 'Conversar sobre sistemas e ERP',
        figure: { title: 'Processos integrados', caption: 'Cada área da empresa conectada a uma base de dados única, com acesso por perfil e integração ao que já existe.' },
        includes: ['Módulos sob medida para cada área', 'Perfis de acesso e permissões', 'Integração com sistemas e planilhas existentes', 'Relatórios e exportação de dados', 'Migração de dados e implantação acompanhada'],
      },
      dashboards: {
        title: 'Dashboards',
        summary: 'Os indicadores da operação reunidos em um só lugar, atualizados a partir dos seus próprios dados.',
        solves: 'Decisões tomadas sem números confiáveis, ou relatórios que levam dias para serem montados.',
        cta: 'Conversar sobre dashboards',
        figure: { title: 'Dos dados à decisão', caption: 'Fontes de dados tratadas e reunidas em indicadores, com metas que mostram onde agir.' },
        includes: ['Definição dos indicadores com a sua equipe', 'Conexão com sistemas, bancos de dados e planilhas', 'Atualização automática', 'Filtros por período, unidade ou responsável', 'Acesso no computador e no celular'],
      },
      ecommerce: {
        title: 'E-commerces',
        summary: 'Lojas virtuais para apresentar produtos, receber pedidos e vender online com uma operação organizada por trás.',
        solves: 'Vendas que dependem só do atendimento manual ou de canais de terceiros.',
        cta: 'Conversar sobre e-commerces',
        figure: { title: 'Da vitrine ao pedido', caption: 'Do catálogo ao pedido, com pagamento, frete e estoque integrados à operação.' },
        includes: ['Catálogo, carrinho e checkout', 'Meios de pagamento e cálculo de frete', 'Gestão de pedidos e estoque', 'Integração com o sistema da empresa', 'Páginas preparadas para buscadores e campanhas'],
      },
    },
    schematic: {
      sites: { nav: 'NAV', hero: 'HERO', sections: 'SEÇÕES', contact: 'CONTATO' },
      sistemas: { modules: ['PEDIDOS', 'ESTOQUE', 'FATURAMENTO', 'FINANCEIRO'], profiles: 'PERFIS DE ACESSO', database: 'BASE DE DADOS ÚNICA', sheets: 'PLANILHAS · SISTEMA ATUAL', reports: 'RELATÓRIOS · EXPORTAÇÃO', integration: 'integração' },
      dashboards: { sources: ['ERP', 'PLANILHAS', 'BANCO DE DADOS'], processing: 'TRATAMENTO', period: 'PERÍODO', unit: 'UNIDADE', target: 'META', decision: 'decisão' },
      ecommerce: { flow: ['CATÁLOGO', 'CARRINHO', 'CHECKOUT', 'PAGAMENTO', 'PEDIDO', 'ESTOQUE · ERP'], add: 'ADICIONAR', checkout: 'CHECKOUT', payment: 'PAGAMENTO', shipping: 'FRETE', total: 'TOTAL', finish: 'FINALIZAR' },
    },
  },
  // Step names preserved verbatim from the process post.
  process: {
    label: 'Processo',
    title: ['Quatro etapas.', 'Você acompanha todas.'],
    intro: 'O processo existe para que nada seja decidido sem você entender o porquê, e para que a entrega chegue como combinado.',
    outcomeLabel: 'Você recebe',
    steps: [
      { title: 'Entendemos', text: 'Conversamos sobre a sua operação, as dificuldades e o que precisa mudar. Quando faz diferença, acompanhamos o trabalho de quem vai usar a solução.', outcome: 'Diagnóstico do problema e objetivos do projeto.' },
      { title: 'Planejamos', text: 'Definimos escopo, prioridades e etapas. As decisões técnicas são explicadas em linguagem clara, antes de qualquer desenvolvimento.', outcome: 'Escopo, prioridades e cronograma por etapas.' },
      { title: 'Desenvolvemos', text: 'Construímos e testamos em ciclos curtos, com entregas que você vê e revisa durante o caminho.', outcome: 'Versões funcionais para validar antes da entrega final.' },
      { title: 'Implementamos', text: 'Colocamos o projeto em uso, orientamos quem vai operar e acompanhamos os primeiros passos.', outcome: 'Projeto em funcionamento e acompanhamento na implantação.' },
    ],
  },
  // Manual p.10 (official manifesto), excerpted without rewriting; p.11 signature; p.9 values.
  manifesto: {
    label: 'Manifesto',
    signature: [{ text: 'Conectando', bold: false }, { text: 'ideias', bold: true }, { text: 'Construindo', bold: false }, { text: 'soluções', bold: true }],
    signatureAria: 'Conectando ideias. Construindo soluções.',
    opening: 'Tudo começa com uma conexão.',
    paragraphs: [
      'Quando uma ideia encontra outra, uma pessoa encontra uma oportunidade e o conhecimento encontra um propósito, algo novo começa a crescer.',
      'Somos feitos de conexões. Conectamos pessoas, ideias, experiências e possibilidades para transformar encontros em movimento e movimento em crescimento.',
      'Porque tecnologia aproxima, conhecimento expande e estratégia direciona. Mas são as conexões que fazem tudo acontecer.',
    ],
    valuesLabel: 'Valores',
    valuesAria: 'Valores da Connections Hub',
    values: ['Confiança', 'Conhecimento', 'Inovação', 'Criatividade', 'Seriedade', 'Otimização'],
  },
  // Contact story post (its three questions, joined into one invitation).
  contact: {
    label: 'Contato',
    title: 'Tem um projeto, uma ideia ou um problema para resolver?',
    lead: 'Conte o que você tem em mente. A primeira conversa serve para entender a necessidade e o melhor caminho para resolvê-la.',
    channels: 'Fale com a Connections Hub',
    whatsapp: 'WhatsApp',
    email: 'E-mail',
    phone: 'Ou ligue:',
  },
  sticker: { peel: 'Descolar o adesivo da Connections Hub', found: 'Você achou o adesivo.', role: 'Design e desenvolvimento deste site', back: 'Colar de volta' },
  projects: { label: 'Projetos', title: 'O que construímos.', delivered: 'Entregas do projeto', visit: 'Visitar projeto' },
  console: { signature: 'Design e código' },
};
