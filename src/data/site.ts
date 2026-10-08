/*
  Site content. Sources: brand manual (p.8 concept, p.9 values, p.10 manifesto, p.11 tagline),
  initial posts (positioning, process names, contact story) and the Instagram bio.
  No clients, metrics, team size or results are invented. Service scopes describe what a
  project *can* include; they are not claims about past work.
*/
export const site = {
  name: 'Connections Hub',
  url: 'https://www.connectionshub.com.br',
  tagline: 'Conectando ideias. Construindo soluções.',
  description: 'A Connections Hub desenvolve sites, sistemas e ERP, dashboards e e-commerces sob medida, do entendimento da operação à implantação.',
  contact: {
    whatsapp: 'https://wa.me/5511974589226',
    telephone: '+5511974589226',
    display: '(11) 97458-9226',
    email: 'contato.connectionstree@gmail.com',
  },
  navigation: [
    { label: 'Sobre', href: '#sobre' },
    { label: 'Soluções', href: '#solucoes' },
    { label: 'Processo', href: '#processo' },
    { label: 'Manifesto', href: '#manifesto' },
  ],
};

export const hero = {
  eyebrow: 'Desenvolvimento de software sob medida',
  lines: ['Conectando ideias.', 'Construindo soluções.'],
  lead: 'Sites, sistemas e ERP, dashboards e e-commerces pensados para a realidade de cada negócio, do planejamento à implantação.',
};

// Manual p.8, verbatim. The fourth line is the brand's own definition of the company.
export const concept = [
  { number: '01', text: 'A semente de uma ideia.' },
  { number: '02', text: 'Ao abrir, se torna uma possibilidade de conexão.' },
  { number: '03', text: 'Mas ela ainda precisa de um ponto de encontro.' },
  { number: '04', text: 'A Connections Hub é o ponto central que reúne clientes aos melhores serviços.' },
];

export const about = {
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
};

export type Solution = {
  id: 'sites' | 'sistemas' | 'dashboards' | 'ecommerce';
  number: string;
  title: string;
  summary: string;
  solves: string;
  includes: string[];
  figure: { title: string; caption: string };
};

export const solutions: Solution[] = [
  {
    id: 'sites', number: '01', title: 'Sites',
    summary: 'Presença institucional que explica com clareza o que a sua empresa faz e facilita o primeiro contato.',
    solves: 'Empresas difíceis de encontrar, ou encontradas sem conseguir mostrar o que oferecem.',
    figure: { title: 'Composição de front-end', caption: 'Um layout, todas as telas: os mesmos componentes reorganizados do desktop ao celular, com o contato sempre à mão.' },
    includes: ['Site institucional e páginas de serviço', 'Estrutura e conteúdo preparados para buscadores', 'Formulários e contato direto pelo WhatsApp', 'Gerenciamento de conteúdo', 'Publicação, domínio e métricas de acesso'],
  },
  {
    id: 'sistemas', number: '02', title: 'Sistemas e ERP',
    summary: 'Software para os processos internos que a operação usa todos os dias: cadastros, pedidos, estoque, financeiro.',
    solves: 'Processos espalhados em planilhas, retrabalho e informações que dependem de uma única pessoa.',
    figure: { title: 'Processos integrados', caption: 'Cada área da empresa conectada a uma base de dados única, com acesso por perfil e integração ao que já existe.' },
    includes: ['Módulos sob medida para cada área', 'Perfis de acesso e permissões', 'Integração com sistemas e planilhas existentes', 'Relatórios e exportação de dados', 'Migração de dados e implantação acompanhada'],
  },
  {
    id: 'dashboards', number: '03', title: 'Dashboards',
    summary: 'Os indicadores da operação reunidos em um só lugar, atualizados a partir dos seus próprios dados.',
    solves: 'Decisões tomadas sem números confiáveis, ou relatórios que levam dias para serem montados.',
    figure: { title: 'Dos dados à decisão', caption: 'Fontes de dados tratadas e reunidas em indicadores, com metas que mostram onde agir.' },
    includes: ['Definição dos indicadores com a sua equipe', 'Conexão com sistemas, bancos de dados e planilhas', 'Atualização automática', 'Filtros por período, unidade ou responsável', 'Acesso no computador e no celular'],
  },
  {
    id: 'ecommerce', number: '04', title: 'E-commerces',
    summary: 'Lojas virtuais para apresentar produtos, receber pedidos e vender online com uma operação organizada por trás.',
    solves: 'Vendas que dependem só do atendimento manual ou de canais de terceiros.',
    figure: { title: 'Da vitrine ao pedido', caption: 'Do catálogo ao pedido, com pagamento, frete e estoque integrados à operação.' },
    includes: ['Catálogo, carrinho e checkout', 'Meios de pagamento e cálculo de frete', 'Gestão de pedidos e estoque', 'Integração com o sistema da empresa', 'Páginas preparadas para buscadores e campanhas'],
  },
];

// Step names preserved verbatim from the process post.
export const process = [
  { number: '01', title: 'Entendemos', text: 'Conversamos sobre a sua operação, as dificuldades e o que precisa mudar. Quando faz diferença, acompanhamos o trabalho de quem vai usar a solução.', outcome: 'Diagnóstico do problema e objetivos do projeto.' },
  { number: '02', title: 'Planejamos', text: 'Definimos escopo, prioridades e etapas. As decisões técnicas são explicadas em linguagem clara, antes de qualquer desenvolvimento.', outcome: 'Escopo, prioridades e cronograma por etapas.' },
  { number: '03', title: 'Desenvolvemos', text: 'Construímos e testamos em ciclos curtos, com entregas que você vê e revisa durante o caminho.', outcome: 'Versões funcionais para validar antes da entrega final.' },
  { number: '04', title: 'Implementamos', text: 'Colocamos o projeto em uso, orientamos quem vai operar e acompanhamos os primeiros passos.', outcome: 'Projeto em funcionamento e acompanhamento na implantação.' },
];

// Manual p.10 (official manifesto), excerpted without rewriting.
export const manifesto = {
  opening: 'Tudo começa com uma conexão.',
  paragraphs: [
    'Quando uma ideia encontra outra, uma pessoa encontra uma oportunidade e o conhecimento encontra um propósito, algo novo começa a crescer.',
    'Somos feitos de conexões. Conectamos pessoas, ideias, experiências e possibilidades para transformar encontros em movimento e movimento em crescimento.',
    'Porque tecnologia aproxima, conhecimento expande e estratégia direciona. Mas são as conexões que fazem tudo acontecer.',
  ],
};

// Manual p.9.
export const values = ['Confiança', 'Conhecimento', 'Inovação', 'Criatividade', 'Seriedade', 'Otimização'];

// Contact story post, verbatim.
export const contact = {
  questions: ['Tem um projeto?', 'Tem uma ideia?', 'Tem um problema para resolver?'],
  title: 'Fale com a Connections Hub.',
  lead: 'Conte o que você tem em mente. A primeira conversa serve para entender a necessidade e o melhor caminho para resolvê-la.',
};
