"use client";

import { useEffect, useState } from "react";
import { api, brl } from "../../lib/api";
import { useRequireAuth } from "../../lib/auth";
import LineChart from "../LineChart";
import CampoMoeda from "../CampoMoeda";
import { taxaValida } from "../../lib/validacao";

const pct = (v) =>
  (Number(v) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + "%";

export default function InvestimentosPage() {
  useRequireAuth();
  const [form, setForm] = useState({ tipo: "CDB", valor: "10000", taxaMensal: "0.01", meses: "24" });
  const [r, setR] = useState(null);
  const [hist, setHist] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function carregarHist() {
    try {
      const todas = await api.simulacoes();
      setHist(todas.filter((s) => s.categoria === "INVESTIMENTO"));
    } catch { /* ignora */ }
  }

  useEffect(() => { carregarHist(); }, []);

  async function simular(e) {
    e.preventDefault();
    setErro("");
    if (!(Number(form.valor) > 0)) { setErro("informe um valor maior que zero"); return; }
    if (!taxaValida(form.taxaMensal)) { setErro("taxa mensal deve ser fração entre 0 e 1 (ex.: 0.01)"); return; }
    const m = Number(form.meses);
    if (!Number.isInteger(m) || m < 1 || m > 360) { setErro("prazo deve ser de 1 a 360 meses"); return; }
    setR(null);
    setCarregando(true);
    try {
      setR(await api.simularInvestimento({
        tipo: form.tipo,
        valor: Number(form.valor),
        taxaMensal: Number(form.taxaMensal),
        meses: Number(form.meses),
      }));
      carregarHist();
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <h1>Simulador de Investimento</h1>
      <p className="muted">Capitalização composta + IR regressivo são calculados pelo núcleo COBOL (CDB tributado; Poupança isenta).</p>

      <div className="card">
        <form onSubmit={simular}>
          <div className="row">
            <div>
              <label>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="CDB">CDB (tributado, IR regressivo)</option>
                <option value="POUPANCA">Poupança (isenta de IR)</option>
              </select>
            </div>
            <div>
              <label>Valor aplicado</label>
              <CampoMoeda value={form.valor} onChange={(v) => setForm({ ...form, valor: v })} />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Taxa mensal (fração, ex.: 0.01 = 1%)</label>
              <input type="number" step="0.0001" min="0" max="1" value={form.taxaMensal}
                     onChange={(e) => setForm({ ...form, taxaMensal: e.target.value })} required />
              {form.taxaMensal !== "" && !taxaValida(form.taxaMensal) && (
                <span className="campo-erro">taxa deve ser fração entre 0 e 1</span>
              )}
            </div>
            <div>
              <label>Prazo (meses)</label>
              <input type="number" min="1" value={form.meses} onChange={(e) => setForm({ ...form, meses: e.target.value })} required />
            </div>
          </div>
          <button disabled={carregando}>{carregando ? "Calculando…" : "Simular"}</button>
          {erro && <div className="erro">{erro}</div>}
        </form>
      </div>

      {r && (
        <div className="card">
          <h2>{form.tipo} · {form.meses} meses</h2>
          <div className="row">
            <div className="muted">Valor final bruto: <strong>{brl(r.valorFinalBruto)}</strong></div>
            <div className="muted">Rendimento bruto: <strong>{brl(r.rendimentoBruto)}</strong></div>
          </div>
          <div className="row">
            <div className="muted">Alíquota IR: <strong>{pct(r.aliquotaIR)}</strong></div>
            <div className="muted">IR retido: <strong>{brl(r.ir)}</strong></div>
            <div className="muted">Rendimento líquido: <strong className="ok">{brl(r.rendimentoLiquido)}</strong></div>
          </div>
          <div className="saldo">{brl(r.valorFinalLiquido)}</div>
          <div className="muted">valor final líquido (após IR)</div>

          <div className="muted" style={{ margin: "14px 0 2px" }}>Crescimento do saldo (bruto)</div>
          <LineChart pontos={r.evolucao.map((p) => p.saldoBruto)} cor="var(--pos)" />

          <table>
            <thead>
              <tr><th>Mês</th><th>Saldo bruto</th><th>Rendimento acum.</th></tr>
            </thead>
            <tbody>
              {r.evolucao.map((p) => (
                <tr key={p.mes}>
                  <td>{p.mes}</td>
                  <td>{brl(p.saldoBruto)}</td>
                  <td>{brl(p.rendimentoAcumulado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hist.length > 0 && (
        <div className="card">
          <h2>Histórico de simulações</h2>
          <table>
            <thead>
              <tr><th>Data</th><th>Simulação</th><th>Líquido</th><th>IR</th></tr>
            </thead>
            <tbody>
              {hist.map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.data).toLocaleString("pt-BR")}</td>
                  <td>{s.subtipo} · {brl(s.valor)} · {s.prazo} meses</td>
                  <td>{brl(s.resultado)}</td>
                  <td>{s.resultado2 != null ? pct(s.resultado2) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
