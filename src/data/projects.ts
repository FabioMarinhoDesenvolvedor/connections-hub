/*
  The projects, taken apart by layer. Facts only, read from each repository on 15/10/2026:
  stack and versions from the manifests, counts from the code (routes, tables, migrations,
  test files), and every name exactly as in the code: modules and their routes, tables with
  their real columns and foreign keys (read from the schema of a local database built by
  each project's own migrations), Tauri commands with their return types.
  No usage numbers: none were measured. Copy (descriptions, roles) lives in src/i18n.

  Layers read top to bottom as the stack is drawn: the interface a person touches, the
  services behind it, where the data lives, and what it runs on or talks to. Each action in
  the live interface is a flow: the call it makes, the module that answers, the table it
  writes (and how), and the outside system it touches, if any.
*/
export const projectIds = ['marketing', 'workhub', 'wsn', 'tasks', 'connections'] as const;
export type ProjectId = (typeof projectIds)[number];
export type ProjectStatus = 'live' | 'staging';

export const layerIds = ['interface', 'services', 'data', 'infra'] as const;
export type LayerId = (typeof layerIds)[number];

export type FactId = 'endpoints' | 'tables' | 'migrations' | 'tests' | 'modules' | 'commands' | 'products' | 'controllers' | 'locales' | 'commits';
export type InfraRole = 'hosting' | 'api' | 'push' | 'login' | 'holidays' | 'server' | 'calendar' | 'email' | 'monitoring' | 'files' | 'container' | 'payments' | 'support' | 'disk' | 'backup' | 'installer' | 'runtime' | 'cdn' | 'repo' | 'browser';

export const github = 'https://github.com/FabioMarinhoDesenvolvedor';

export type Tech = { id: string; name: string; version?: string };
/**
 * A module, table or outside system, named as in the code or by its product name.
 * Services carry a route (or signature) and how many routes the module has; tables carry
 * some of their real columns (`→table` marks a foreign key), their column count and the
 * tables they point to; outside systems carry their role.
 */
export type Node = { id: string; label: string; meta?: string; count?: number; columns?: string[]; links?: string[]; role?: InfraRole };
export type Layer = { tech: Tech[]; nodes: Node[]; /** Nodes not drawn. */ more?: number };
/**
 * `call` and `sql` may hold {placeholders} filled by the interface (the card, the ticket…).
 * `sql` names the real columns the action touches; `body` is the request body where it is
 * known from the code.
 */
export type Flow = { method: string; call: string; service: string; table: string; op: 'SELECT' | 'INSERT' | 'UPDATE' | 'WRITE'; sql: string; body?: string; infra?: string };
/** A guided run through the live interface: what to press (a selector inside it) or type. */
export type Step = { target: string; type?: string };

export type Project = {
  id: ProjectId;
  name: string;
  /** Absent for the studio's own products (the copy names them). */
  client?: string;
  status: ProjectStatus;
  since?: string;
  version?: string;
  repo?: string;
  /** A product anyone can install: the latest installer and the page with every version. */
  download?: { url: string; releases: string };
  facts: { id: FactId; value: number }[];
  layers: Record<LayerId, Layer>;
  flows: Record<string, Flow>;
  steps: Step[];
};

export const projects: Project[] = [
  {
    id: 'marketing', name: 'Marketing Dashboard', client: 'Connections Hub', status: 'staging', since: '2026-10',
    facts: [{ id: 'endpoints', value: 70 }, { id: 'tables', value: 60 }, { id: 'migrations', value: 43 }, { id: 'tests', value: 108 }],
    layers: {
      interface: {
        tech: [{ id: 'react', name: 'React', version: '19' }, { id: 'vite', name: 'Vite', version: '8' }, { id: 'tailwind', name: 'Tailwind CSS', version: '4' }, { id: 'dndkit', name: 'dnd kit' }, { id: 'motion', name: 'Motion' }],
        nodes: [],
      },
      services: {
        tech: [{ id: 'node', name: 'Node.js', version: '22' }, { id: 'fastify', name: 'Fastify', version: '5' }, { id: 'zod', name: 'Zod', version: '4' }, { id: 'jwt', name: 'JWT' }],
        nodes: [
          { id: 'auth', label: 'auth', meta: 'POST /auth/login' },
          { id: 'boards', label: 'boards', meta: 'POST /boards' },
          { id: 'calendar', label: 'calendar', meta: 'GET /calendar' },
          { id: 'audit', label: 'audit', meta: 'GET /audit-log' },
          { id: 'push', label: 'push', meta: 'POST /push/subscribe' },
          { id: 'cards', label: 'cards', meta: 'POST /cards/:id/enviar-ao-cliente' },
          { id: 'decisao', label: 'decisão', meta: 'POST /cards/:id/decisao' },
          { id: 'programacao', label: 'programação', meta: 'POST /cards/:id/programar' },
        ],
        more: 55,
      },
      data: {
        tech: [{ id: 'postgres', name: 'PostgreSQL' }, { id: 'pg', name: 'node-postgres' }],
        nodes: [
          { id: 'boards', label: 'boards', columns: ['id', 'client_id', 'name', 'platforms'], count: 11 },
          { id: 'lists', label: 'lists', columns: ['id', 'board_id →boards', 'title', 'role'], count: 12, links: ['boards'] },
          { id: 'push_subscriptions', label: 'push_subscriptions', columns: ['user_id', 'endpoint', 'p256dh'], count: 8 },
          { id: 'audit_log', label: 'audit_log', columns: ['actor_id', 'action', 'entity'], count: 9 },
          { id: 'cards', label: 'cards', columns: ['id', 'list_id →lists', 'title', 'post_date'], count: 25, links: ['lists'] },
          { id: 'card_approved_snapshots', label: 'card_approved_snapshots', columns: ['card_id →cards', 'approved_at', 'caption'], count: 7, links: ['cards'] },
          { id: 'card_social_targets', label: 'card_social_targets', columns: ['card_id →cards', 'destino', 'status'], count: 13, links: ['cards'] },
        ],
        more: 53,
      },
      infra: {
        tech: [{ id: 'vercel', name: 'Vercel' }, { id: 'docker', name: 'Docker' }, { id: 'webpush', name: 'Web Push' }],
        nodes: [{ id: 'vercel', label: 'Vercel', role: 'hosting' }, { id: 'api', label: 'API Node', role: 'api' }, { id: 'webpush', label: 'Web Push', role: 'push' }, { id: 'google', label: 'Google OAuth', role: 'login' }, { id: 'nager', label: 'Nager.Date', role: 'holidays' }],
      },
    },
    flows: {
      send: { method: 'POST', call: '/api/cards/{id}/enviar-ao-cliente', service: 'cards', table: 'cards', op: 'UPDATE', sql: 'UPDATE cards SET list_id = … WHERE id = {id}', infra: 'webpush' },
      approve: { method: 'POST', call: '/api/cards/{id}/decisao', body: '{ "decisao": "aprovado" }', service: 'decisao', table: 'card_approved_snapshots', op: 'INSERT', sql: 'INSERT INTO card_approved_snapshots (card_id, approved_at, caption) VALUES ({id}, now(), …)', infra: 'webpush' },
      schedule: { method: 'POST', call: '/api/cards/{id}/programar', service: 'programacao', table: 'card_social_targets', op: 'INSERT', sql: 'INSERT INTO card_social_targets (card_id, destino, status) VALUES ({id}, …, …)' },
    },
    steps: [
      { target: '[data-flow="send"][data-id="41"]' },
      { target: '[data-flow="approve"][data-id="41"]' },
      { target: '[data-flow="schedule"][data-id="41"]' },
      { target: '[data-flow="send"][data-id="42"]' },
    ],
  },
  {
    id: 'workhub', name: 'WorkHub', client: 'Clube Atlético Juventus', status: 'live', since: '2026-06',
    facts: [{ id: 'endpoints', value: 315 }, { id: 'tables', value: 94 }, { id: 'modules', value: 30 }, { id: 'tests', value: 123 }],
    layers: {
      interface: {
        tech: [{ id: 'react', name: 'React', version: '18' }, { id: 'vite', name: 'Vite', version: '6' }, { id: 'query', name: 'TanStack Query', version: '5' }, { id: 'tailwind', name: 'Tailwind CSS', version: '3' }],
        nodes: [],
      },
      services: {
        tech: [{ id: 'nest', name: 'NestJS', version: '10' }, { id: 'jwt', name: 'JWT' }, { id: 'schedule', name: '@nestjs/schedule' }, { id: 'pdf', name: 'React-PDF' }],
        nodes: [
          { id: 'contracts', label: 'contracts', meta: '/contracts', count: 15 },
          { id: 'news', label: 'news', meta: '/news', count: 15 },
          { id: 'calendar', label: 'calendar', meta: '/calendar/events', count: 9 },
          { id: 'monitoring', label: 'monitoring', meta: '/monitoring', count: 6 },
          { id: 'reports', label: 'reports', meta: '/reports', count: 4 },
          { id: 'audit', label: 'audit', meta: '/audit', count: 5 },
          { id: 'tickets', label: 'tickets', meta: '/tickets', count: 14 },
          { id: 'inventory', label: 'inventory', meta: '/inventory', count: 6 },
        ],
        more: 22,
      },
      data: {
        tech: [{ id: 'postgres', name: 'PostgreSQL', version: '16' }, { id: 'prisma', name: 'Prisma', version: '6' }],
        nodes: [
          { id: 'departments', label: 'departments', columns: ['id', 'name', 'priority_weight', 'requires_approval'], count: 16 },
          { id: 'contracts', label: 'contracts', columns: ['number', 'value', 'end_date', 'department_id →departments'], count: 13, links: ['departments'] },
          { id: 'ticket_sla_pauses', label: 'ticket_sla_pauses', columns: ['ticket_id →tickets', 'started_at', 'resume_reason'], count: 10, links: ['tickets'] },
          { id: 'audit_log', label: 'audit_log', columns: ['actor_id', 'module', 'action', 'summary'], count: 17 },
          { id: 'tickets', label: 'tickets', columns: ['id', 'title', 'status', 'department_id →departments'], count: 23, links: ['departments'] },
          { id: 'ticket_status_history', label: 'ticket_status_history', columns: ['ticket_id →tickets', 'from_status', 'to_status'], count: 6, links: ['tickets'] },
          { id: 'ticket_material_items', label: 'ticket_material_items', columns: ['ticket_id →tickets', 'inventory_item_id →inventory_items', 'quantity_requested'], count: 7, links: ['tickets', 'inventory_items'] },
          { id: 'inventory_items', label: 'inventory_items', columns: ['id', 'name', 'quantity', 'min_quantity'], count: 10 },
        ],
        more: 86,
      },
      infra: {
        tech: [{ id: 'linux', name: 'Linux · systemd' }, { id: 'graph', name: 'Microsoft Graph' }, { id: 'smtp', name: 'Nodemailer' }],
        nodes: [{ id: 'server', label: 'Servidor do clube', role: 'server' }, { id: 'graph', label: 'Outlook · Graph', role: 'calendar' }, { id: 'smtp', label: 'SMTP', role: 'email' }, { id: 'proxmox', label: 'Proxmox', role: 'monitoring' }, { id: 'share', label: 'Rede SMB', role: 'files' }],
      },
    },
    flows: {
      assign: { method: 'PATCH', call: '/tickets/{id}/assign', service: 'tickets', table: 'ticket_status_history', op: 'INSERT', sql: "INSERT INTO ticket_status_history (ticket_id, from_status, to_status) VALUES ({id}, 'OPEN', 'IN_PROGRESS')", infra: 'smtp' },
      resolve: { method: 'PATCH', call: '/tickets/{id}/status', service: 'tickets', table: 'tickets', op: 'UPDATE', sql: "UPDATE tickets SET status = 'RESOLVED', resolved_at = now() WHERE id = {id}", infra: 'smtp' },
      material: { method: 'POST', call: '/inventory/movements', service: 'inventory', table: 'ticket_material_items', op: 'UPDATE', sql: 'UPDATE ticket_material_items SET quantity_delivered = quantity_requested WHERE ticket_id = {id}' },
    },
    steps: [
      { target: '[data-flow="assign"][data-id="7"]' },
      { target: '[data-flow="resolve"][data-id="7"]' },
      { target: '[data-flow="material"][data-id="14"]' },
      { target: '[data-flow="resolve"][data-id="14"]' },
    ],
  },
  {
    id: 'wsn', name: 'WSN Loja', client: 'WSN Distribuidora', status: 'staging', since: '2026-10',
    facts: [{ id: 'products', value: 60 }, { id: 'controllers', value: 18 }, { id: 'tests', value: 67 }],
    layers: {
      interface: {
        tech: [{ id: 'hotwire', name: 'Hotwire', version: 'Turbo · Stimulus' }, { id: 'viewcomponent', name: 'ViewComponent' }, { id: 'tailwind', name: 'Tailwind CSS', version: '3' }],
        nodes: [],
      },
      services: {
        tech: [{ id: 'rails', name: 'Ruby on Rails', version: '8.1' }, { id: 'solidus', name: 'Solidus', version: '4.7' }, { id: 'ruby', name: 'Ruby', version: '3.4' }, { id: 'devise', name: 'Devise' }],
        nodes: [
          { id: 'catalog', label: 'catálogo', meta: 'GET /products' },
          { id: 'stock', label: 'estoque', meta: 'Spree::StockItem' },
          { id: 'admin', label: 'admin', meta: '/admin' },
          { id: 'contact', label: 'contato', meta: 'POST /contato' },
          { id: 'cart', label: 'carrinho', meta: 'POST /cart_line_items' },
          { id: 'promotions', label: 'promoções', meta: 'Spree::Promotion' },
          { id: 'checkout', label: 'checkout', meta: 'PATCH /checkout/update/:state' },
        ],
      },
      data: {
        tech: [{ id: 'postgres', name: 'PostgreSQL' }, { id: 'storage', name: 'Active Storage' }],
        nodes: [
          { id: 'spree_products', label: 'spree_products', columns: ['id', 'name', 'slug', 'available_on'], count: 16 },
          { id: 'spree_variants', label: 'spree_variants', columns: ['product_id →spree_products', 'sku', 'is_master'], count: 19, links: ['spree_products'] },
          { id: 'spree_stock_items', label: 'spree_stock_items', columns: ['variant_id →spree_variants', 'count_on_hand'], count: 8, links: ['spree_variants'] },
          { id: 'mensagens_contato', label: 'mensagens_contato', columns: ['nome', 'empresa', 'email', 'assunto'], count: 10 },
          { id: 'spree_orders', label: 'spree_orders', columns: ['id', 'number', 'state', 'total'], count: 37 },
          { id: 'spree_line_items', label: 'spree_line_items', columns: ['order_id →spree_orders', 'variant_id →spree_variants', 'quantity', 'price'], count: 15, links: ['spree_orders', 'spree_variants'] },
          { id: 'spree_adjustments', label: 'spree_adjustments', columns: ['order_id →spree_orders', 'source_type', 'amount'], count: 15, links: ['spree_orders'] },
          { id: 'spree_payments', label: 'spree_payments', columns: ['order_id →spree_orders', 'amount', 'state'], count: 16, links: ['spree_orders'] },
        ],
      },
      infra: {
        tech: [{ id: 'render', name: 'Render' }, { id: 'docker', name: 'Docker' }, { id: 'stripe', name: 'Stripe' }],
        nodes: [{ id: 'render', label: 'Render', role: 'hosting' }, { id: 'docker', label: 'Docker', role: 'container' }, { id: 'stripe', label: 'Stripe', role: 'payments' }, { id: 'whatsapp', label: 'WhatsApp', role: 'support' }],
      },
    },
    flows: {
      add: { method: 'POST', call: '/cart_line_items', body: '{ "variant_id": …, "quantity": 1 }', service: 'cart', table: 'spree_line_items', op: 'INSERT', sql: 'INSERT INTO spree_line_items (order_id, variant_id, quantity, price) VALUES (…, …, 1, {price})' },
      shipping: { method: 'POST', call: '/cart_line_items', body: '{ "variant_id": …, "quantity": 1 }', service: 'promotions', table: 'spree_adjustments', op: 'INSERT', sql: "INSERT INTO spree_adjustments (order_id, source_type, amount) VALUES (…, 'Spree::PromotionAction', …)" },
      checkout: { method: 'PATCH', call: '/checkout/update/payment', service: 'checkout', table: 'spree_payments', op: 'INSERT', sql: "INSERT INTO spree_payments (order_id, amount, state) VALUES (…, {total}, 'checkout')", infra: 'stripe' },
    },
    steps: [
      { target: '[data-flow][data-id="papel-toalha"]' },
      { target: '[data-flow][data-id="papel-toalha"]' },
      { target: '[data-flow][data-id="papel-toalha"]' },
      { target: '[data-flow][data-id="luva-nitrilica"]' },
      { target: '[data-flow="checkout"]' },
    ],
  },
  {
    id: 'tasks', name: 'Tasks', status: 'live', version: '0.4.1',
    download: {
      url: 'https://github.com/FabioMarinhoDesenvolvedor/tasks/releases/latest/download/Tasks_x64-setup.exe',
      releases: 'https://github.com/FabioMarinhoDesenvolvedor/tasks/releases',
    },
    facts: [{ id: 'commands', value: 12 }, { id: 'tests', value: 35 }],
    layers: {
      interface: {
        tech: [{ id: 'react', name: 'React', version: '19' }, { id: 'tailwind', name: 'Tailwind CSS', version: '4' }, { id: 'webview', name: 'WebView2' }],
        nodes: [],
      },
      services: {
        tech: [{ id: 'rust', name: 'Rust' }, { id: 'tauri', name: 'Tauri', version: '2' }, { id: 'serde', name: 'serde' }],
        nodes: [
          { id: 'load', label: 'load', meta: '→ Snapshot' },
          { id: 'preview_restore', label: 'preview_restore', meta: '→ RestorePreview' },
          { id: 'run_import', label: 'run_import', meta: '→ Report' },
          { id: 'save_task', label: 'save_task', meta: '→ Task' },
          { id: 'mutate', label: 'mutate', meta: '→ Snapshot' },
          { id: 'export_backup', label: 'export_backup', meta: '→ bool' },
        ],
        more: 6,
      },
      data: {
        tech: [{ id: 'sqlite', name: 'SQLite' }, { id: 'rusqlite', name: 'rusqlite', version: '0.37' }],
        nodes: [
          { id: 'boards', label: 'boards', columns: ['id', 'name'], count: 2 },
          { id: 'projects', label: 'projects', columns: ['id', 'name'], count: 2 },
          { id: 'people', label: 'people', columns: ['id', 'name'], count: 2 },
          { id: 'columns', label: 'columns', columns: ['board_id →boards', 'name', 'position'], count: 4, links: ['boards'] },
          { id: 'tasks', label: 'tasks', columns: ['column_id →columns', 'priority', 'due_date', 'labels'], count: 16, links: ['columns', 'projects'] },
          { id: 'project_archive', label: 'project_archive', columns: ['project_id →projects'], count: 1, links: ['projects'] },
        ],
      },
      infra: {
        tech: [{ id: 'windows', name: 'Windows' }, { id: 'nsis', name: 'NSIS' }],
        nodes: [{ id: 'nsis', label: 'Instalador NSIS', role: 'installer' }, { id: 'webview', label: 'WebView2', role: 'runtime' }, { id: 'disk', label: '%LOCALAPPDATA%', role: 'disk' }, { id: 'backup', label: 'tasks.sqlite3', role: 'backup' }],
      },
    },
    flows: {
      create: { method: 'invoke', call: 'save_task(task, create: true)', service: 'save_task', table: 'tasks', op: 'INSERT', sql: "INSERT INTO tasks (title, priority, due_date, labels, column_id) VALUES ('{title}', {priority}, …, …, 'inbox')", infra: 'disk' },
      move: { method: 'invoke', call: 'mutate(Reorder)', service: 'mutate', table: 'tasks', op: 'UPDATE', sql: 'UPDATE tasks SET column_id = …, position = … WHERE id = …', infra: 'disk' },
      backup: { method: 'invoke', call: 'export_backup()', service: 'export_backup', table: 'tasks', op: 'SELECT', sql: 'sqlite3_backup_step(…) → tasks.sqlite3', infra: 'backup' },
    },
    steps: [
      { target: '.tk-entry input', type: 'Pagar luz amanhã !alta #casa' },
      { target: '.tk-col:first-child li:last-child [data-flow="move"]' },
      { target: '[data-flow="backup"]' },
    ],
  },
  {
    id: 'connections', name: 'Connections Hub', client: 'Connections Hub', status: 'live', since: '2026-09',
    repo: 'https://github.com/FabioMarinhoDesenvolvedor/connections-hub',
    facts: [{ id: 'locales', value: 3 }, { id: 'commits', value: 12 }],
    layers: {
      interface: {
        tech: [{ id: 'react', name: 'React', version: '19' }, { id: 'css', name: 'CSS próprio' }, { id: 'satoshi', name: 'Satoshi' }],
        nodes: [],
      },
      services: {
        tech: [{ id: 'next', name: 'Next.js', version: '16' }, { id: 'three', name: 'three.js' }, { id: 'webgl', name: 'WebGL2' }],
        nodes: [
          { id: 'seed', label: 'seed', meta: 'WebGL2 · SDF' },
          { id: 'pt', label: '/', meta: 'SSG · pt-BR' },
          { id: 'en', label: '/en', meta: 'SSG · en' },
          { id: 'ja', label: '/ja', meta: 'SSG · ja' },
          { id: 'theme', label: 'theme', meta: "'themechange'" },
        ],
      },
      data: {
        tech: [{ id: 'ts', name: 'TypeScript' }, { id: 'tokens', name: 'Design tokens' }],
        nodes: [
          { id: 'projects', label: 'projects.ts', columns: ['id', 'layers', 'flows'] },
          { id: 'pt', label: 'pt.ts', columns: ['meta', 'hero', 'projects'] },
          { id: 'en', label: 'en.ts', columns: ['meta', 'hero', 'projects'] },
          { id: 'ja', label: 'ja.ts', columns: ['meta', 'hero', 'projects'] },
          { id: 'tokens', label: 'tokens.css', columns: ['--navy', '--sand', '--orange'] },
        ],
      },
      infra: {
        tech: [{ id: 'vercel', name: 'Vercel' }, { id: 'github', name: 'GitHub' }],
        nodes: [{ id: 'github', label: 'GitHub', role: 'repo' }, { id: 'vercel', label: 'Vercel', role: 'cdn' }, { id: 'storage', label: 'localStorage', role: 'browser' }],
      },
    },
    flows: {
      pt: { method: 'GET', call: '/', service: 'pt', table: 'pt', op: 'SELECT', sql: "getDictionary('pt') · prerendered", infra: 'vercel' },
      en: { method: 'GET', call: '/en', service: 'en', table: 'en', op: 'SELECT', sql: "getDictionary('en') · prerendered", infra: 'vercel' },
      ja: { method: 'GET', call: '/ja', service: 'ja', table: 'ja', op: 'SELECT', sql: "getDictionary('ja') · prerendered", infra: 'vercel' },
      theme: { method: 'set', call: 'html[data-theme]', service: 'theme', table: 'tokens', op: 'WRITE', sql: "localStorage.setItem('theme', '{theme}')", infra: 'storage' },
    },
    steps: [
      { target: '[data-flow="en"]' },
      { target: '[data-flow="ja"]' },
      { target: '[data-flow="theme"]' },
      { target: '[data-flow="theme"]' },
      { target: '[data-flow="pt"]' },
    ],
  },
];
