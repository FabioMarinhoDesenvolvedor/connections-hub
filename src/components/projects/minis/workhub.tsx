'use client';

import { useState } from 'react';
import type { MiniProps } from './types';

/*
  WorkHub, in the club's maroon. The IT queue with business-hours SLA: take a ticket,
  resolve it, or pull material from stock for a request. Names and people are made up.
*/
type Status = 'open' | 'doing' | 'done';
type Ticket = { id: number; title: string; dept: string; status: Status; sla: number; who?: string; material?: boolean; late?: boolean };
const start: Ticket[] = [
  { id: 7, title: 'Wi-Fi instável no salão social', dept: 'TI', status: 'open', sla: 0.35 },
  { id: 6, title: 'Acesso ao financeiro para nova colaboradora', dept: 'Tesouraria', status: 'open', sla: 1.04, late: true },
  { id: 5, title: 'Impressora da Secretaria sem cor', dept: 'Secretaria', status: 'doing', sla: 0.6, who: 'Carlos M.' },
  { id: 14, title: '2 cabos HDMI para a sala do conselho', dept: 'Presidência', status: 'open', sla: 0.2, material: true },
];
const statusName: Record<Status, string> = { open: 'Aberto', doing: 'Em andamento', done: 'Resolvido' };
const agents = ['Larissa C.', 'Carlos M.'];

export function WorkhubMini({ act }: MiniProps) {
  const [tickets, setTickets] = useState(start);
  const step = (ticket: Ticket, from: HTMLElement) => {
    if (ticket.status === 'done') return;
    const flow = ticket.status === 'doing' ? 'resolve' : ticket.material ? 'material' : 'assign';
    act(flow, from, { id: ticket.id });
    setTickets(all => all.map(t => t.id !== ticket.id ? t : t.status === 'open'
      ? { ...t, status: 'doing', who: t.who ?? agents[t.id % agents.length] }
      : { ...t, status: 'done' }));
  };
  const open = tickets.filter(t => t.status === 'open').length;
  const doing = tickets.filter(t => t.status === 'doing').length;
  const late = tickets.filter(t => t.late && t.status !== 'done').length;
  const label = (t: Ticket) => t.status === 'doing' ? 'Resolver' : t.material ? 'Separar material' : 'Atender';

  return <div className="mini mini-wh" lang="pt-BR">
    <header className="wh-bar">
      <span className="wh-logo" aria-hidden="true">W</span>
      <span className="wh-brand">WorkHub<small>Clube</small></span>
      <nav className="wh-nav" aria-label="WorkHub"><span>Início</span><span aria-current="page">Chamados</span><span>Contratos</span><span>Estoque TI</span><span>Calendário</span></nav>
      <span className="wh-me" aria-hidden="true">LC</span>
    </header>
    <div className="wh-head">
      <div><p className="wh-eyebrow">Atendimento</p><h4>Chamados</h4></div>
      {tickets.every(t => t.status === 'done')
        ? <button type="button" className="wh-new" onClick={() => setTickets(start)}>Recomeçar</button>
        : <span className="wh-new" aria-hidden="true">+ Novo chamado</span>}
    </div>
    <dl className="wh-kpis">
      <div><dt>Em aberto</dt><dd>{open}</dd></div>
      <div><dt>Em andamento</dt><dd>{doing}</dd></div>
      <div data-alert={late > 0 || undefined}><dt>Fora do SLA</dt><dd>{late}</dd></div>
    </dl>
    <ul className="wh-list" data-no-orbit>
      {tickets.map(ticket => <li key={ticket.id} className="wh-row" data-status={ticket.status}>
        <div className="wh-title">
          <p>{ticket.title}</p>
          <small>#{ticket.id} · {ticket.dept}{ticket.who && <> · {ticket.who}</>}</small>
        </div>
        <span className="wh-pill">{statusName[ticket.status]}</span>
        <div className="wh-sla" data-late={(ticket.late && ticket.status !== 'done') || undefined}>
          <span><i style={{ width: `${Math.min(100, (ticket.status === 'done' ? Math.min(ticket.sla, 0.9) : ticket.sla) * 100)}%` }} /></span>
          <small>{ticket.status === 'done' ? (ticket.late ? 'resolvido fora do prazo' : 'resolvido no prazo') : ticket.late ? 'SLA vencido há 20 min' : `restam ${Math.round((1 - ticket.sla) * 4 * 10) / 10} h úteis`}</small>
        </div>
        {ticket.status !== 'done'
          ? <button type="button" className="wh-act" data-flow={ticket.status === 'doing' ? 'resolve' : ticket.material ? 'material' : 'assign'} data-id={ticket.id} onClick={event => step(ticket, event.currentTarget)}>{label(ticket)}</button>
          : <span className="wh-ok" aria-hidden="true">✓</span>}
      </li>)}
    </ul>
  </div>;
}
