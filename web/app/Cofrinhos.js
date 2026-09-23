"use client";

import { useEffect, useState } from "react";
import { api, brl } from "../lib/api";
import CampoMoeda from "./CampoMoeda";

export default function Cofrinhos({ contaId, onSaldoConta }) {
  const [lista, setLista] = useState([]);
  const [novo, setNovo] = useState({ nome: "", meta: "" });
  const [criando, setCriando] = useState(false);
  const [acao, setAcao] = useState(null);     // { id, tipo: "guardar"|"resgatar" }
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");
  const [proj, setProj] = useState(null);     // rendimento projetado (COBOL)

  function carregar() { api.cofrinhos(contaId).then(setLista).catch(() => {}); }
  useEffect(() => { carregar(); }, [contaId]);

  const totalGuardado = lista.reduce((s, c) => s + Number(c.saldo), 0);

  // projeção de rendimento em 12 meses como poupança — calculada pelo núcleo COBOL
  useEffect(() => {
    if (totalGuardado <= 0) { setProj(null); return; }
    api.simularInvestimento({ tipo: "POUPANCA", valor: totalGuardado, taxaMensal: 0.005, meses: 12 })
      .then((r) => setProj(r.rendimentoLiquido)).catch(() => setProj(null));
  }, [totalGuardado]);

  async function criar(e) {
    e.preventDefault(); setErro("");
    if (!novo.nome.trim()) return setErro("dê um nome ao cofrinho");
    try {
      await api.criarCofrinho(contaId, { nome: novo.nome.trim(), meta: Number(novo.meta) || 0 });
      setNovo({ nome: "", meta: "" }); setCriando(false); carregar();
    } catch (e) { setErro(e.message); }
  }

  async function confirmar() {
    setErro("");
    const v = Number(valor);
    if (!(v > 0)) return setErro("informe um valor");
    try {
      const r = acao.tipo === "guardar"
        ? await api.guardarCofrinho(acao.id, v)
        : await api.resgatarCofrinho(acao.id, v);
      onSaldoConta?.(r.saldoConta);
      setAcao(null); setValor(""); carregar();
    } catch (e) { setErro(e.message); }
  }

  return (
    <div className="cof">
      <div className="cof-topo">
        <div>
          <span className="muted" style={{ fontSize: "0.8rem" }}>Guardado em cofrinhos</span>
          <div className="cof-total">{brl(totalGuardado)}</div>
        </div>
        {proj != null && (
          <div className="cof-proj" title="Projeção calculada pelo núcleo COBOL (poupança)">
            rende ~<strong>{brl(proj)}</strong> em 12 meses
          </div>
        )}
      </div>

      {lista.map((c) => {
        const pct = Number(c.meta) > 0 ? Math.min(100, (Number(c.saldo) / Number(c.meta)) * 100) : null;
        const ativo = acao?.id === c.id;
        return (
          <div key={c.id} className="cof-item">
            <div className="cof-item-hd">
              <span className="cof-nome">{c.nome}</span>
              <span className="cof-saldo">{brl(c.saldo)}</span>
            </div>
            {pct != null && (
              <>
                <div className="cof-barra"><div className="cof-fill" style={{ width: `${pct}%` }} /></div>
                <div className="muted" style={{ fontSize: "0.72rem", marginTop: 3 }}>
                  {pct.toFixed(0)}% da meta de {brl(c.meta)}
                </div>
              </>
            )}
            <div className="cof-acoes">
              <button className="cof-mini" onClick={() => { setAcao({ id: c.id, tipo: "guardar" }); setValor(""); setErro(""); }}>Guardar</button>
              <button className="cof-mini" onClick={() => { setAcao({ id: c.id, tipo: "resgatar" }); setValor(""); setErro(""); }} disabled={Number(c.saldo) <= 0}>Resgatar</button>
            </div>
            {ativo && (
              <div className="cof-form">
                <CampoMoeda value={valor} onChange={setValor} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="cof-mini" onClick={() => { setAcao(null); setErro(""); }}>Cancelar</button>
                  <button onClick={confirmar} style={{ margin: 0 }}>
                    {acao.tipo === "guardar" ? "Guardar" : "Resgatar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {criando ? (
        <form onSubmit={criar} className="cof-item">
          <label>Nome do cofrinho</label>
          <input value={novo.nome} maxLength={60} placeholder="Ex.: Viagem, Reserva"
                 onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          <label>Meta (opcional)</label>
          <CampoMoeda value={novo.meta} onChange={(v) => setNovo({ ...novo, meta: v })} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className="cof-mini" onClick={() => setCriando(false)}>Cancelar</button>
            <button type="submit" style={{ margin: 0 }}>Criar cofrinho</button>
          </div>
        </form>
      ) : (
        <button className="cof-add" onClick={() => setCriando(true)}>+ Novo cofrinho</button>
      )}

      {erro && <div className="erro">{erro}</div>}

      <style>{`
        .cof-topo { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
        .cof-total { font-size: 1.5rem; font-weight: 800; color: var(--primary-2); font-variant-numeric: tabular-nums; }
        .cof-proj { font-size: 0.8rem; color: var(--muted); background: rgba(20,184,166,0.08);
          border: 1px solid rgba(20,184,166,0.22); border-radius: 999px; padding: 5px 12px; }
        .cof-proj strong { color: var(--pos); }
        .cof-item { padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-soft); margin-bottom: 10px; }
        .cof-item-hd { display: flex; justify-content: space-between; align-items: baseline; }
        .cof-nome { font-weight: 600; }
        .cof-saldo { font-weight: 700; font-variant-numeric: tabular-nums; }
        .cof-barra { height: 8px; border-radius: 999px; background: rgba(255,255,255,0.07); margin-top: 8px; overflow: hidden; }
        .cof-fill { height: 100%; background: var(--primary-2); border-radius: 999px; transition: width 0.3s ease; }
        .cof-acoes { display: flex; gap: 8px; margin-top: 12px; }
        .cof-mini { margin: 0; padding: 7px 12px; font-size: 0.8rem; background: rgba(255,255,255,0.06);
          color: var(--text); border: 1px solid var(--border); box-shadow: none; border-radius: 8px; }
        .cof-mini:hover:not(:disabled) { background: rgba(255,255,255,0.12); filter: none; }
        .cof-mini:disabled { opacity: 0.4; cursor: not-allowed; }
        .cof-form { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
        .cof-add { width: 100%; background: rgba(20,184,166,0.10); color: var(--primary-2);
          border: 1px dashed rgba(20,184,166,0.4); box-shadow: none; }
        .cof-add:hover { background: rgba(20,184,166,0.16); filter: none; }
      `}</style>
    </div>
  );
}
