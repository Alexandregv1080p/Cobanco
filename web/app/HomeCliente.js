"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, brl } from "../lib/api";
import CartaoVirtual from "./CartaoVirtual";
import ExtratoTimeline from "./ExtratoTimeline";

const ico = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" };

// ações rápidas circulares (estilo app de banco)
function acoes(contaId) {
  const base = contaId ? `/contas/${contaId}` : "/contas";
  return [
    { href: base, label: "Transferir", svg: <svg {...ico}><path d="M7 17V7h10" /><path d="M7 7l10 10" /><path d="M17 7l-4 0M17 7l0 4" /></svg> },
    { href: base, label: "Depositar", svg: <svg {...ico}><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></svg> },
    { href: base, label: "Extrato", svg: <svg {...ico}><path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h10" /></svg> },
    { href: "/emprestimos", label: "Empréstimo", svg: <svg {...ico}><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5a2.5 2.5 0 0 1 5 0c0 3-5 1.5-5 4.5a2.5 2.5 0 0 0 5 0" /></svg> },
  ];
}

export default function HomeCliente({ user, contas }) {
  const [mostrar, setMostrar] = useState(true);
  const [extrato, setExtrato] = useState([]);

  const conta = contas[0];                       // conta principal
  const saldoTotal = contas.reduce((s, c) => s + Number(c.saldo), 0);

  useEffect(() => {
    if (!conta) return;
    api.extrato(conta.id).then(setExtrato).catch(() => {});
  }, [conta?.id]);

  return (
    <>
      <h1>Olá, {user?.nome?.split(" ")[0] || "bem-vindo"}</h1>
      <p className="page-sub">O que você quer fazer hoje?</p>

      {/* Saldo + ações rápidas */}
      <div className="card hc-hero">
        <div className="hc-saldo-hd">
          <span className="muted">Saldo disponível</span>
          <button type="button" className="olho" onClick={() => setMostrar((v) => !v)}
                  title={mostrar ? "Ocultar saldo" : "Mostrar saldo"}>
            {mostrar ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.16 3.19M6.6 6.6A17.8 17.8 0 0 0 2 12s3 8 10 8a9 9 0 0 0 5.4-1.6" /><path d="M1 1l22 22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" /><circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        <div className={"saldo" + (saldoTotal < 0 ? " negativo" : "")}>
          {mostrar ? brl(saldoTotal) : "R$ ••••••"}
        </div>
        <div className="muted" style={{ fontSize: "0.76rem" }}>
          {contas.length} conta(s) · atualizado agora
        </div>

        <div className="hc-acoes">
          {acoes(conta?.id).map((a) => (
            <Link key={a.label} href={a.href} className="hc-acao">
              <span className="hc-acao-ic">{a.svg}</span>
              <span>{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Cartão + contas */}
      <div className="hc-grid">
        {conta && (
          <div className="card">
            <h2>Meu cartão</h2>
            <CartaoVirtual seed={conta.numero} titular={user?.nome} />
          </div>
        )}
        <div className="card">
          <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Minhas contas
            <Link href="/contas" style={{ fontSize: "0.75rem", fontWeight: 500 }}>ver todas →</Link>
          </h2>
          {contas.length === 0 ? (
            <p className="muted">Nenhuma conta ainda. <Link href="/contas">Criar a primeira</Link>.</p>
          ) : (
            <div className="hc-contas">
              {contas.map((c) => (
                <Link key={c.id} href={`/contas/${c.id}`} className="hc-conta">
                  <div>
                    <div className="hc-conta-num">Conta {c.numero}</div>
                    <div className="muted" style={{ fontSize: "0.76rem" }}>Ag. 0001</div>
                  </div>
                  <div className={"hc-conta-saldo " + (Number(c.saldo) < 0 ? "neg" : "")}>
                    {mostrar ? brl(c.saldo) : "••••"}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Últimas transações */}
      {conta && (
        <div className="card">
          <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Últimas transações
            <Link href={`/contas/${conta.id}`} style={{ fontSize: "0.75rem", fontWeight: 500 }}>ver extrato →</Link>
          </h2>
          <ExtratoTimeline itens={extrato} limite={5} />
        </div>
      )}

      <style>{`
        .hc-saldo-hd { display: flex; align-items: center; justify-content: space-between; }
        .hc-acoes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 20px; }
        .hc-acao { display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 14px 6px; border-radius: 14px; background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-soft); color: var(--text); font-size: 0.8rem; font-weight: 600; }
        .hc-acao:hover { background: rgba(20,184,166,0.10); border-color: rgba(20,184,166,0.3); }
        .hc-acao-ic { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: rgba(20,184,166,0.14); color: var(--primary-2); }
        .hc-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 22px; align-items: start; }
        @media (max-width: 780px) { .hc-grid { grid-template-columns: 1fr; } .hc-acoes { grid-template-columns: repeat(2,1fr); } }
        .hc-contas { display: flex; flex-direction: column; gap: 8px; }
        .hc-conta { display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-soft); color: var(--text); }
        .hc-conta:hover { background: rgba(255,255,255,0.06); }
        .hc-conta-num { font-weight: 600; }
        .hc-conta-saldo { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--pos); }
        .hc-conta-saldo.neg { color: var(--neg); }
      `}</style>
    </>
  );
}
