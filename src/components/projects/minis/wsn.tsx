'use client';

import { useState } from 'react';
import type { MiniProps } from './types';

/*
  WSN Loja: the storefront in WSN's navy and green. Four products of the real catalogue at
  their catalogue prices; free shipping above R$ 299, as the store's Solidus promotion.
*/
const products = [
  { id: 'alcool-gel', name: 'Álcool 70% gel · 5 L', price: 39.9 },
  { id: 'detergente', name: 'Detergente neutro · 500 ml', price: 2.8 },
  { id: 'luva-nitrilica', name: 'Luva nitrílica sem pó · preta', price: 32.9 },
  { id: 'papel-toalha', name: 'Papel toalha bobina · 6 un', price: 98 },
];
const FREE = 299;
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function WsnMini({ act }: MiniProps) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [ordered, setOrdered] = useState(false);
  const total = products.reduce((sum, p) => sum + p.price * (cart[p.id] ?? 0), 0);
  const items = Object.values(cart).reduce((a, b) => a + b, 0);
  const add = (id: string, from: HTMLElement) => {
    const price = products.find(p => p.id === id)!.price;
    const crosses = total < FREE && total + price >= FREE;
    act(crosses ? 'shipping' : 'add', from, { price: price.toFixed(2) });
    setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  };
  const checkout = (from: HTMLElement) => {
    if (ordered) { setCart({}); setOrdered(false); return; }
    act('checkout', from, { total: total.toFixed(2) });
    setOrdered(true);
  };

  return <div className="mini mini-wsn" lang="pt-BR">
    <header className="wsn-top">
      <span className="wsn-logo" aria-hidden="true"><i /><b>WSN</b><small>Descartáveis e EPIs</small></span>
      <span className="wsn-search">Buscar produtos</span>
      <span className="wsn-cart" aria-live="polite">Carrinho<b>{items}</b></span>
    </header>
    <nav className="wsn-cats" aria-label="Categorias"><span>Limpeza e higiene</span><span>Descartáveis</span><span aria-current="page">EPIs</span><span>Embalagens</span><span>Papéis</span></nav>
    <div className="wsn-ship" data-free={total >= FREE || undefined}>
      <p>{ordered ? 'Pedido R-1042 recebido · pagamento em análise' : total >= FREE ? 'Frete grátis liberado' : `Faltam ${money(FREE - total)} para o frete grátis`}</p>
      <span><i style={{ width: `${Math.min(100, (total / FREE) * 100)}%` }} /></span>
    </div>
    <ul className="wsn-grid" data-no-orbit>
      {products.map(product => <li key={product.id} className="wsn-product">
        <img src={`/projects/wsn/${product.id}.webp`} alt="" width={240} height={240} loading="lazy" decoding="async" />
        <p>{product.name}</p>
        <strong>{money(product.price)}</strong>
        <button type="button" className="wsn-add" data-flow="add" data-id={product.id} disabled={ordered} onClick={event => add(product.id, event.currentTarget)}>
          {cart[product.id] ? `No carrinho · ${cart[product.id]}` : 'Adicionar'}
        </button>
      </li>)}
    </ul>
    <footer className="wsn-total">
      <span>Subtotal <b>{money(total)}</b></span>
      <button type="button" className="wsn-checkout" data-flow="checkout" disabled={!items} onClick={event => checkout(event.currentTarget)}>{ordered ? 'Nova compra' : 'Finalizar compra'}</button>
    </footer>
  </div>;
}
