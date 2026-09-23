"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api, brl } from "../lib/api";
import { getUser } from "../lib/auth";

function construir(extrato) {
  return [...extrato].slice(0, 10).map((tx) => {
    let titulo = "Transferência", entrada = false;
    if (tx.tipo === "DEPOSITO") { titulo = "Depósito recebido"; entrada = true; }
    else if (tx.tipo === "SAQUE") { titulo = "Saque realizado"; }
    else if (tx.tipo === "JUROS_CE") { titulo = "Juros de cheque especial"; }
    return { id: tx.id, titulo, valor: tx.valor, entrada, data: tx.data };
  });
}

const tempoRel = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return `há ${Math.floor(s / 86400)} d`;
};

export default function Notificacoes() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [itens, setItens] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [seen, setSeen] = useState(0);

  const chaveSeen = user ? `notif_seen_${user.clienteId || "admin"}` : null;

  useEffect(() => { setUser(getUser()); }, [pathname]);

  useEffect(() => {
    if (!user) return;
    try { setSeen(Number(localStorage.getItem(chaveSeen) || 0)); } catch { /* ignora */ }
    (async () => {
      try {
        const contas = await api.listarContas();
        if (!contas.length) return;
        const ext = await api.extrato(contas[0].id);
        setItens(construir(ext));
      } catch { /* ignora */ }
    })();
  }, [user, pathname]);

  if (pathname === "/login" || pathname === "/registrar" || !user) return null;

  const naoLidas = itens.filter((n) => n.id > seen).length;

  function alternar() {
    const abrir = !aberto;
    setAberto(abrir);
    if (abrir && itens.length) {
      const max = Math.max(...itens.map((n) => n.id));
      setSeen(max);
      try { localStorage.setItem(chaveSeen, String(max)); } catch { /* ignora */ }
    }
  }

  return (
    <div className="nt-wrap">
      <button className="nt-sino" onClick={alternar} aria-label="Notificações">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {naoLidas > 0 && <span className="nt-badge">{naoLidas > 9 ? "9+" : naoLidas}</span>}
      </button>

      {aberto && (
        <>
          <div className="nt-scrim" onClick={() => setAberto(false)} />
          <div className="nt-painel">
            <div className="nt-head">Notificações</div>
            {itens.length === 0 ? (
              <div className="nt-vazio">Sem novidades por aqui.</div>
            ) : itens.map((n) => (
              <div key={n.id} className="nt-item">
                <span className={"nt-ico " + (n.entrada ? "nt-in" : "nt-out")}>
                  {n.entrada ? "↓" : "↑"}
                </span>
                <div className="nt-info">
                  <div className="nt-titulo">{n.titulo}</div>
                  <div className="nt-sub">{tempoRel(n.data)}</div>
                </div>
                <div className={"nt-valor " + (n.entrada ? "nt-in" : "nt-out")}>
                  {n.entrada ? "+ " : "− "}{brl(n.valor)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        .nt-wrap { position: fixed; top: 18px; right: 26px; z-index: 60; }
        .nt-sino { position: relative; margin: 0; width: 42px; height: 42px; padding: 0;
          display: flex; align-items: center; justify-content: center; border-radius: 12px;
          background: var(--surface-2); color: var(--text); border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
        .nt-sino:hover { background: rgba(255,255,255,0.08); filter: none; }
        .nt-badge { position: absolute; top: -5px; right: -5px; min-width: 18px; height: 18px; padding: 0 4px;
          border-radius: 999px; background: var(--neg); color: #fff; font-size: 0.68rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center; border: 2px solid var(--surface); }
        .nt-scrim { position: fixed; inset: 0; z-index: 59; }
        .nt-painel { position: absolute; top: 50px; right: 0; z-index: 61; width: 340px; max-width: 90vw;
          background: linear-gradient(170deg, var(--surface-2), var(--surface));
          border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 24px 60px -18px rgba(0,0,0,0.75);
          overflow: hidden; animation: nt-in 0.15s ease; }
        @keyframes nt-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        .nt-head { padding: 14px 16px; font-weight: 700; color: #fff; border-bottom: 1px solid var(--border-soft); }
        .nt-vazio { padding: 22px 16px; color: var(--muted); font-size: 0.88rem; text-align: center; }
        .nt-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.04); }
        .nt-item:last-child { border-bottom: none; }
        .nt-ico { width: 30px; height: 30px; flex-shrink: 0; border-radius: 50%; font-weight: 800;
          display: flex; align-items: center; justify-content: center; }
        .nt-in { color: var(--pos); } .nt-out { color: var(--neg); }
        .nt-ico.nt-in { background: rgba(52,211,153,0.12); }
        .nt-ico.nt-out { background: rgba(251,113,133,0.12); }
        .nt-info { flex: 1; min-width: 0; }
        .nt-titulo { font-weight: 600; font-size: 0.9rem; color: var(--text); }
        .nt-sub { font-size: 0.74rem; color: var(--muted); }
        .nt-valor { font-weight: 700; font-size: 0.86rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
        @media (max-width: 640px) { .nt-wrap { top: 12px; right: 14px; } }
      `}</style>
    </div>
  );
}
