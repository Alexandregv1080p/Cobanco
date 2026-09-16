"use client";

import { useState } from "react";
import { api, brl } from "../../lib/api";
import { useRequireAuth } from "../../lib/auth";

const pct = (v) =>
  (Number(v) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + "%";

export default function InvestimentosPage() {
  useRequireAuth();
  const [form, setForm] = useState({ tipo: "CDB", valor: "10000", taxaMensal: "0.01", meses: "24" });
  const [r, setR] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function simular(e) {
    e.preventDefault();
    setErro("");
    setR(null);
    setCarregando(true);
    try {
      setR(await api.simularInvestimento({
        tipo: form.tipo,
        valor: Number(form.valor),
        taxaMensal: Number(form.taxaMensal),
        meses: Number(form.meses),
      }));
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
              <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Taxa mensal (fração, ex.: 0.01 = 1%)</label>
              <input type="number" step="0.0001" value={form.taxaMensal} onChange={(e) => setForm({ ...form, taxaMensal: e.target.value })} required />
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
    </>
  );
}
