"use client";

import { brl } from "../lib/api";

function canalLabel(m) {
  return { PIX: "Pix", BOLETO: "Boleto", CARTAO: "Cartão", TED: "TED", ESPECIE: "Espécie" }[m] || (m || "—");
}

function rotuloDia(d) {
  const hoje = new Date(), ont = new Date(); ont.setDate(hoje.getDate() - 1);
  const igual = (a, b) => a.toDateString() === b.toDateString();
  if (igual(d, hoje)) return "Hoje";
  if (igual(d, ont)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

/**
 * Extrato em feed estilo app de banco: agrupado por dia (Hoje/Ontem/data)
 * com saldo do dia, cada item com ícone de entrada/saída, tipo, hora e valor.
 * Direção derivada da variação do saldo (robusto até p/ transferência).
 * `limite`: se informado, mostra só as N transações mais recentes.
 */
export default function ExtratoTimeline({ itens, limite }) {
  if (!itens.length) return <p className="muted">Sem movimentações.</p>;

  const asc = [...itens].sort((a, b) => new Date(a.data) - new Date(b.data) || a.id - b.id);
  const entradaDe = {}; let prev = null;
  asc.forEach((tx) => {
    const s = Number(tx.saldoApos);
    entradaDe[tx.id] = prev === null ? tx.tipo === "DEPOSITO" : s > prev;
    prev = s;
  });

  let desc = [...asc].reverse();
  if (limite) desc = desc.slice(0, limite);

  const grupos = [];
  desc.forEach((tx) => {
    const dia = new Date(tx.data), chave = dia.toDateString();
    let g = grupos.find((x) => x.chave === chave);
    if (!g) { g = { chave, rotulo: rotuloDia(dia), saldoDia: tx.saldoApos, itens: [] }; grupos.push(g); }
    g.itens.push(tx);
  });

  const rotuloTipo = (tx, entrada) =>
    tx.tipo === "DEPOSITO" ? "Depósito"
      : tx.tipo === "SAQUE" ? "Saque"
      : tx.tipo === "JUROS_CE" ? "Juros de cheque especial"
      : entrada ? "Transferência recebida" : "Transferência enviada";

  return (
    <div className="tl">
      {grupos.map((g) => (
        <div key={g.chave} className="tl-grupo">
          <div className="tl-dia">
            <span>{g.rotulo}</span>
            <span className="tl-saldo-dia">saldo {brl(g.saldoDia)}</span>
          </div>
          {g.itens.map((tx) => {
            const entrada = entradaDe[tx.id];
            return (
              <div key={tx.id} className="tl-item">
                <span className={"tl-ico " + (entrada ? "tl-in" : "tl-out")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {entrada ? <><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></>
                             : <><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>}
                  </svg>
                </span>
                <div className="tl-info">
                  <div className="tl-tipo">{rotuloTipo(tx, entrada)}</div>
                  <div className="tl-sub">
                    {new Date(tx.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    {tx.metodo && ` · ${canalLabel(tx.metodo)}`}
                    {tx.detalhe && ` · ${tx.detalhe}`}
                  </div>
                </div>
                <div className={"tl-valor " + (entrada ? "tl-in" : "tl-out")}>
                  {entrada ? "+ " : "− "}{brl(tx.valor)}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <style>{`
        .tl-grupo { margin-bottom: 6px; }
        .tl-dia { display: flex; justify-content: space-between; align-items: baseline;
          padding: 12px 2px 6px; font-size: 0.74rem; font-weight: 700; letter-spacing: 0.04em;
          text-transform: uppercase; color: var(--faint); border-bottom: 1px solid var(--border-soft); }
        .tl-saldo-dia { font-weight: 600; text-transform: none; letter-spacing: 0; }
        .tl-item { display: flex; align-items: center; gap: 12px; padding: 11px 2px;
          border-bottom: 1px solid rgba(255,255,255,0.04); }
        .tl-ico { width: 34px; height: 34px; flex-shrink: 0; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; }
        .tl-in { color: var(--pos); }
        .tl-out { color: var(--neg); }
        .tl-ico.tl-in { background: rgba(52,211,153,0.12); }
        .tl-ico.tl-out { background: rgba(251,113,133,0.12); }
        .tl-info { flex: 1; min-width: 0; }
        .tl-tipo { color: var(--text); font-weight: 600; font-size: 0.92rem; }
        .tl-sub { color: var(--muted); font-size: 0.76rem; margin-top: 1px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tl-valor { font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
      `}</style>
    </div>
  );
}
