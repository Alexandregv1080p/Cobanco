"use client";

import { useEffect, useState } from "react";
import { api, brl } from "../../lib/api";
import { useRequireAuth } from "../../lib/auth";

const pct = (v) =>
  (Number(v) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + "%";

export default function EmprestimosPage() {
  useRequireAuth();
  const [form, setForm] = useState({ valor: "100000", taxaMensal: "0.015", prazoMeses: "12", sistema: "PRICE" });
  const [resultado, setResultado] = useState(null);
  const [hist, setHist] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function carregarHist() {
    try {
      const todas = await api.simulacoes();
      setHist(todas.filter((s) => s.categoria === "EMPRESTIMO"));
    } catch { /* ignora */ }
  }

  useEffect(() => { carregarHist(); }, []);

  async function simular(e) {
    e.preventDefault();
    setErro("");
    setResultado(null);
    setCarregando(true);
    try {
      const r = await api.simular({
        valor: Number(form.valor),
        taxaMensal: Number(form.taxaMensal),
        prazoMeses: Number(form.prazoMeses),
        sistema: form.sistema,
      });
      setResultado(r);
      carregarHist();
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <h1>Simulador de Empréstimo</h1>
      <p className="muted">A tabela (Price/SAC/Americano) e os custos (IOF, CET) são calculados pelo núcleo COBOL.</p>

      <div className="card">
        <form onSubmit={simular}>
          <div className="row">
            <div>
              <label>Valor do empréstimo</label>
              <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
            </div>
            <div>
              <label>Taxa mensal (fração, ex.: 0.015 = 1,5%)</label>
              <input type="number" step="0.0001" value={form.taxaMensal} onChange={(e) => setForm({ ...form, taxaMensal: e.target.value })} required />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Prazo (meses)</label>
              <input type="number" min="1" value={form.prazoMeses} onChange={(e) => setForm({ ...form, prazoMeses: e.target.value })} required />
            </div>
            <div>
              <label>Sistema</label>
              <select value={form.sistema} onChange={(e) => setForm({ ...form, sistema: e.target.value })}>
                <option value="PRICE">PRICE (parcela fixa)</option>
                <option value="SAC">SAC (amortização fixa)</option>
                <option value="AMERICANO">AMERICANO (só juros; principal no fim)</option>
              </select>
            </div>
          </div>
          <button disabled={carregando}>{carregando ? "Calculando…" : "Simular"}</button>
          {erro && <div className="erro">{erro}</div>}
        </form>
      </div>

      {resultado && (
        <div className="card">
          <h2>
            {resultado.sistema} · {resultado.prazoMeses}x <span className="muted">de {brl(resultado.valor)}</span>
          </h2>
          <div className="row">
            <div className="muted">Total de juros: <strong>{brl(resultado.totalJuros)}</strong></div>
            <div className="muted">IOF: <strong>{brl(resultado.totalIOF)}</strong></div>
            <div className="muted">Total pago: <strong>{brl(resultado.totalPago)}</strong></div>
          </div>
          <div className="row">
            <div className="muted">CET mensal: <strong>{pct(resultado.cetMensal)}</strong></div>
            <div className="muted">CET anual: <strong>{pct(resultado.cetAnual)}</strong></div>
          </div>
          <table>
            <thead>
              <tr><th>Nº</th><th>Parcela</th><th>Juros</th><th>Amortização</th><th>Saldo devedor</th></tr>
            </thead>
            <tbody>
              {resultado.parcelas.map((p) => (
                <tr key={p.numero}>
                  <td>{p.numero}</td>
                  <td>{brl(p.parcela)}</td>
                  <td>{brl(p.juros)}</td>
                  <td>{brl(p.amortizacao)}</td>
                  <td>{brl(p.saldoDevedor)}</td>
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
              <tr><th>Data</th><th>Simulação</th><th>Total pago</th><th>CET mensal</th></tr>
            </thead>
            <tbody>
              {hist.map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.data).toLocaleString("pt-BR")}</td>
                  <td>{s.subtipo} · {brl(s.valor)} · {s.prazo}x</td>
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
