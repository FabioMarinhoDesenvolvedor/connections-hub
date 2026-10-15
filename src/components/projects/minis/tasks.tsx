'use client';

import { useState } from 'react';
import type { MiniProps } from './types';

/*
  Tasks, the desktop app: its window, sidebar and board. The entry line reads dates,
  priorities and tags the way the app does ("amanhã !alta #casa"); a card moves one column
  per click; the backup link runs the verified export. Graphite in the dark theme, Paper in
  the light one — two of the app's own five themes.
*/
type Priority = 0 | 1 | 2 | 3;
type Task = { id: number; title: string; column: 0 | 1 | 2; priority: Priority; due?: string; tag?: string; project: 'site' | 'app' | 'home' };
const start: Task[] = [
  { id: 1, title: 'Definir paleta e tipografia', column: 0, priority: 2, due: 'dom', project: 'site' },
  { id: 2, title: 'Integrar pagamento por Pix', column: 0, priority: 3, due: 'amanhã', project: 'app' },
  { id: 3, title: 'Tela de carrinho', column: 1, priority: 3, due: 'hoje', project: 'app' },
  { id: 4, title: 'Wireframes das telas', column: 2, priority: 1, project: 'app' },
];
const columns = ['A fazer', 'Fazendo', 'Feito'];
const priorityName = ['', 'Baixa', 'Média', 'Alta'];
const words: Record<string, Priority> = { '!alta': 3, '!media': 2, '!média': 2, '!baixa': 1 };
const days = ['hoje', 'amanhã', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

/** The app's quick-entry grammar, reduced: a day word, a !priority and a #tag. */
function parse(text: string) {
  let priority: Priority = 0, due: string | undefined, tag: string | undefined;
  const rest = text.split(/\s+/).filter(word => {
    const lower = word.toLowerCase();
    if (lower in words) { priority = words[lower]; return false; }
    if (lower.startsWith('#') && lower.length > 1) { tag = lower.slice(1); return false; }
    if (days.includes(lower)) { due = lower; return false; }
    return true;
  });
  return { title: rest.join(' ').trim(), priority, due, tag };
}

export function TasksMini({ act }: MiniProps) {
  const [tasks, setTasks] = useState(start);
  const [text, setText] = useState('');
  const [toast, setToast] = useState('');
  const preview = parse(text);

  const create = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!preview.title) return;
    act('create', event.currentTarget.querySelector('input')!, { title: preview.title, priority: preview.priority });
    setTasks(all => [...all, { id: Date.now(), title: preview.title, column: 0, priority: preview.priority, due: preview.due, tag: preview.tag, project: 'home' }]);
    setText('');
  };
  const move = (task: Task, from: HTMLElement) => {
    act('move', from);
    setTasks(all => all.map(t => t.id === task.id ? { ...t, column: ((t.column + 1) % 3) as Task['column'] } : t));
  };
  const backup = (from: HTMLElement) => {
    act('backup', from);
    setToast('Backup verificado · tasks-2026-10-15.sqlite3');
    window.setTimeout(() => setToast(''), 2600);
  };

  return <div className="mini mini-tasks" lang="pt-BR">
    <header className="tk-title">
      <span className="tk-icon" aria-hidden="true">✓</span>Tasks
      <span className="tk-window" aria-hidden="true"><i>–</i><i>□</i><i>×</i></span>
    </header>
    <div className="tk-body">
      <aside className="tk-side">
        <p className="tk-nav"><span>Foco</span><span>Tarefas</span><span aria-current="page">Quadro</span><span>Calendário</span><span>Registro</span></p>
        <p className="tk-group">Projetos</p>
        <p className="tk-projects"><span data-p="site">Site novo</span><span data-p="app">App de pedidos</span><span data-p="home">Pessoal</span></p>
        <button type="button" className="tk-backup" data-flow="backup" onClick={event => backup(event.currentTarget)}>Exportar backup</button>
      </aside>
      <main className="tk-main">
        <h4>Quadro <small>quinta-feira, 15 de outubro</small></h4>
        <form className="tk-entry" onSubmit={create}>
          <span aria-hidden="true">+</span>
          <input data-flow="create" value={text} onChange={event => setText(event.target.value)} placeholder="Nova tarefa — ex.: Pagar luz amanhã !alta #casa" aria-label="Nova tarefa" />
          {(preview.due || preview.priority > 0 || preview.tag) && <span className="tk-parse" aria-live="polite">
            {preview.due && <i>{preview.due}</i>}{preview.priority > 0 && <i data-prio={preview.priority}>{priorityName[preview.priority]}</i>}{preview.tag && <i>#{preview.tag}</i>}
          </span>}
        </form>
        <ol className="tk-board" data-no-orbit>
          {columns.map((name, column) => <li key={name} className="tk-col">
            <p className="tk-col-name">{name}<span>{tasks.filter(t => t.column === column).length}</span></p>
            <ul>
              {tasks.filter(t => t.column === column).map(task => <li key={task.id}>
                <button type="button" className="tk-card" data-flow="move" data-id={task.id} data-done={task.column === 2 || undefined} onClick={event => move(task, event.currentTarget)}>
                  <span className="tk-check" aria-hidden="true" />
                  <span className="tk-card-title">{task.title}</span>
                  <span className="tk-card-meta">
                    <i data-p={task.project} />
                    {task.priority > 0 && <em data-prio={task.priority}>{priorityName[task.priority]}</em>}
                    {task.due && <em>{task.due}</em>}
                    {task.tag && <em>#{task.tag}</em>}
                  </span>
                </button>
              </li>)}
            </ul>
          </li>)}
        </ol>
      </main>
    </div>
    {toast && <p className="tk-toast" role="status">{toast}</p>}
  </div>;
}
