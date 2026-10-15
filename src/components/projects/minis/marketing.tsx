'use client';

import { useState } from 'react';
import type { MiniProps } from './types';

/*
  Marketing Dashboard, rebuilt in its own design language (navy on paper, terracotta
  accent, glass bar). A board for one made-up client: a post goes to the client, comes
  back approved and gets scheduled. Each step is a real route of the API.
*/
type Card = { id: number; title: string; nets: ('ig' | 'fb' | 'in' | 'tt')[]; step: 0 | 1 | 2 | 3; when?: string };
const start: Card[] = [
  { id: 41, title: 'Lançamento do cardápio de primavera', nets: ['ig', 'fb'], step: 0 },
  { id: 42, title: 'Bastidores da torra', nets: ['ig', 'tt'], step: 0 },
  { id: 38, title: 'Promoção de terça', nets: ['ig'], step: 1 },
  { id: 35, title: 'Horário de feriado', nets: ['ig', 'fb'], step: 2 },
  { id: 31, title: 'Vaga de barista', nets: ['in'], step: 3, when: 'qui · 09:30' },
];
const steps = ['Produção', 'Com o cliente', 'Aprovado', 'Programado'];
const slots = ['sex · 18:00', 'sáb · 11:00', 'dom · 10:00', 'seg · 12:30'];
const action: Record<number, { label: string; flow: string } | undefined> = {
  0: { label: 'Enviar ao cliente', flow: 'send' },
  1: { label: 'Aprovar', flow: 'approve' },
  2: { label: 'Programar', flow: 'schedule' },
};
const netName = { ig: 'Instagram', fb: 'Facebook', in: 'LinkedIn', tt: 'TikTok' };

export function MarketingMini({ act }: MiniProps) {
  const [cards, setCards] = useState(start);
  const [slot, setSlot] = useState(0);
  const advance = (id: number, from: HTMLElement) => {
    const card = cards.find(c => c.id === id);
    const next = card && action[card.step];
    if (!card || !next) return;
    act(next.flow, from, { id });
    setCards(all => all.map(c => c.id === id ? { ...c, step: (c.step + 1) as Card['step'], when: c.step === 2 ? slots[slot % slots.length] : c.when } : c));
    if (card.step === 2) setSlot(s => s + 1);
  };
  const count = (step: number) => cards.filter(c => c.step === step).length;
  const done = cards.every(c => c.step === 3);

  return <div className="mini mini-mkt" lang="pt-BR">
    <header className="mkt-bar">
      <span className="mkt-logo" aria-hidden="true"><b>C</b></span>
      <nav className="mkt-nav" aria-label="Marketing Dashboard">
        <span>Dashboard</span><span aria-current="page">Boards</span><span>Calendário</span><span>Aprovações</span>
      </nav>
      <span className="mkt-clock">10:42</span>
      <span className="mkt-user"><i>A</i>Ana</span>
    </header>
    <div className="mkt-head">
      <span className="mkt-avatar" aria-hidden="true">CA</span>
      <div>
        <p className="mkt-eyebrow">Board · Outubro</p>
        <h4>Café Aurora</h4>
      </div>
      {done && <button type="button" className="mkt-reset" onClick={() => setCards(start)}>Recomeçar</button>}
    </div>
    <dl className="mkt-kpis">
      {steps.map((name, i) => <div key={name} data-step={i}><dt>{name}</dt><dd>{count(i)}</dd></div>)}
    </dl>
    <ol className="mkt-board" data-no-orbit>
      {steps.map((name, step) => <li key={name} className="mkt-col" data-step={step}>
        <p className="mkt-col-name">{name}<span>{count(step)}</span></p>
        <ul>
          {cards.filter(c => c.step === step).map(card => <li key={card.id} className="mkt-card">
            <p className="mkt-card-title">{card.title}</p>
            <p className="mkt-card-meta">
              {card.nets.map(n => <i key={n} data-net={n} title={netName[n]}>{n === 'in' ? 'in' : n === 'tt' ? '♪' : n === 'ig' ? '◎' : 'f'}</i>)}
              <span>#{card.id}</span>
              {card.when && <span className="mkt-when">{card.when}</span>}
            </p>
            {action[card.step] && <button type="button" className="mkt-act" data-flow={action[card.step]!.flow} data-id={card.id} onClick={event => advance(card.id, event.currentTarget)}>{action[card.step]!.label}</button>}
          </li>)}
        </ul>
      </li>)}
    </ol>
  </div>;
}
