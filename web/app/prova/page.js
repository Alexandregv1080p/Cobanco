"use client";

import { useState } from "react";
import { api, brl } from "../../lib/api";
import { useRequireAuth } from "../../lib/auth";

// Reimplementação INGÊNUA em ponto flutuante (IEEE-754 double, o `number` do JS)
// da MESMA fórmula do AMORTIZACAO.COB — porém sem a disciplina decimal (nada de
// arredondar cada parcela a centavos). É assim que o erro de float se acumula.
function simularFloat({ valor, taxaMensal, prazoMeses, sistema }) {
  const i = taxaMensal, n = prazoMeses;
  let pmt = 0, amortBase = 0;
  if (sistema === "PRICE") {
    if (i === 0) pmt = valor / n;
    else { const f = Math.pow(1 + i, n); pmt = (valor * i * f) / (f - 1); }
  } else if (sistema === "SAC") {
    amortBase = valor / n;
  }
  let saldo = valor, totalJuros = 0, totalPago = 0;
  const parcelas = [];
  for (let k = 1; k <= n; k++) {
    const juros = saldo * i;              // sem ROUNDED — guarda a fração binária
    let amort, parcela;
    if (sistema === "PRICE") {
      if (k === n) { amort = saldo; parcela = juros + amort; }
      else { parcela = pmt; amort = parcela - juros; }
    } else if (sistema === "SAC") {
      amort = (k === n) ? saldo : amortBase;
      parcela = amort + juros;
    } else { // AMERICANO
      amort = (k === n) ? saldo : 0;
      parcela = amort + juros;
    }
    saldo -= amort;
    parcelas.push({ numero: k, parcela, juros, amortizacao: amort, saldoDevedor: saldo });
    totalJuros += juros;
    totalPago += parcela;
  }
  return { totalJuros, totalPago, parcelas };
}

// formata com 6 casas p/ expor a "sujeira" binária do double
const f6 = (v) => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
const cent = (v) => (Number(v) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export default function ProvaPage() {
  useRequireAuth();
  const [form, setForm] = useState({ valor: "250000", taxaMensal: "0.0189", prazoMeses: "24", sistema: "PRICE" });
  const [cobol, setCobol] = useState(null);
  const [flt, setFlt] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function rodar(e) {
    e.preventDefault();
    setErro(""); setCobol(null); setFlt(null); setCarregando(true);
    const args = {
      valor: Number(form.valor), taxaMensal: Number(form.taxaMensal),
      prazoMeses: Number(form.prazoMeses), sistema: form.sistema,
    };
    try {
      const r = await api.simular(args);   // verdade decimal (COBOL COMP-3)
      setCobol(r);
      setFlt(simularFloat(args));           // versão ingênua em float
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  // diferenças (COBOL é a verdade)
  const deltaJuros = cobol && flt ? Number(flt.totalJuros) - Number(cobol.totalJuros) : 0;
  const deltaPago  = cobol && flt ? Number(flt.totalPago)  - Number(cobol.totalPago)  : 0;
  const parcelasDivergentes = cobol && flt
    ? cobol.parcelas.filter((p, k) => Number(p.juros).toFixed(2) !== Number(flt.parcelas[k].juros).toFixed(2)).length
    : 0;

  return (
    <>
      <h1>Prova de Exatidão</h1>
      <p className="muted" style={{ maxWidth: 760 }}>
        O mesmo empréstimo calculado por dois motores: o núcleo <strong>COBOL</strong>, que usa
        <strong> COMP-3</strong> (decimal compactado, aritmética <strong>exata</strong> em centavos), e uma
        reimplementação <strong>ingênua em ponto flutuante</strong> (o <code>double</code> IEEE-754, tipo
        <code> number</code> do JavaScript). Mesma fórmula, aritmética diferente — e o float <strong>deriva</strong>.
      </p>

      {/* Hook: o clássico 0.1 + 0.2 */}
      <div className="card prova-glitch">
        <code>0.1 + 0.2 === 0.3</code> &nbsp;→&nbsp;
        <strong style={{ color: "var(--neg)" }}>{String(0.1 + 0.2 === 0.3)}</strong>
        &nbsp;· &nbsp;<span className="muted">0.1 + 0.2 = {(0.1 + 0.2).toString()}</span>
        <div className="muted" style={{ fontSize: "0.82rem", marginTop: 6 }}>
          Frações decimais não têm representação exata em binário. Num banco, esse resíduo vira dinheiro que não bate.
        </div>
      </div>

      {/* Entradas */}
      <div className="card">
        <form onSubmit={rodar}>
          <div className="row">
            <div>
              <label>Valor do empréstimo</label>
              <input type="number" step="0.01" value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
            </div>
            <div>
              <label>Taxa mensal (fração, ex.: 0.0189 = 1,89%)</label>
              <input type="number" step="0.0001" value={form.taxaMensal}
                onChange={(e) => setForm({ ...form, taxaMensal: e.target.value })} required />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Prazo (meses)</label>
              <input type="number" min="1" max="360" value={form.prazoMeses}
                onChange={(e) => setForm({ ...form, prazoMeses: e.target.value })} required />
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
          <button style={{ width: "100%" }} disabled={carregando}>
            {carregando ? "Calculando nos dois motores…" : "Rodar prova"}
          </button>
          {erro && <div className="erro">{erro}</div>}
        </form>
      </div>

      {cobol && flt && (
        <>
          {/* Placar da divergência */}
          <div className="stats">
            <div className="stat">
              <div className="k">Δ Total de juros</div>
              <div className={"v " + (Math.abs(deltaJuros) >= 0.005 ? "neg" : "pos")}>
                {deltaJuros >= 0 ? "+" : "−"}{cent(Math.abs(deltaJuros))} ¢
              </div>
              <div className="s">float − COBOL</div>
            </div>
            <div className="stat">
              <div className="k">Δ Total pago</div>
              <div className={"v " + (Math.abs(deltaPago) >= 0.005 ? "neg" : "pos")}>
                {deltaPago >= 0 ? "+" : "−"}{cent(Math.abs(deltaPago))} ¢
              </div>
              <div className="s">float − COBOL</div>
            </div>
            <div className="stat">
              <div className="k">Parcelas divergentes</div>
              <div className={"v " + (parcelasDivergentes > 0 ? "neg" : "pos")}>
                {parcelasDivergentes} / {cobol.parcelas.length}
              </div>
              <div className="s">juros diferem em ≥ 1 centavo</div>
            </div>
          </div>

          {/* Totais lado a lado */}
          <div className="card">
            <h2>Totais — COBOL (exato) × float (ingênuo)</h2>
            <table>
              <thead><tr><th></th><th>COBOL (COMP-3)</th><th>Ponto flutuante</th><th>Diferença</th></tr></thead>
              <tbody>
                <tr>
                  <td>Total de juros</td>
                  <td style={{ color: "var(--pos)" }}>{brl(cobol.totalJuros)}</td>
                  <td className="mono">R$ {f6(flt.totalJuros)}</td>
                  <td style={{ color: Math.abs(deltaJuros) >= 0.005 ? "var(--neg)" : "var(--muted)" }}>R$ {f6(deltaJuros)}</td>
                </tr>
                <tr>
                  <td>Total pago</td>
                  <td style={{ color: "var(--pos)" }}>{brl(cobol.totalPago)}</td>
                  <td className="mono">R$ {f6(flt.totalPago)}</td>
                  <td style={{ color: Math.abs(deltaPago) >= 0.005 ? "var(--neg)" : "var(--muted)" }}>R$ {f6(deltaPago)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Parcela a parcela */}
          <div className="card">
            <h2>Juros parcela a parcela</h2>
            <p className="muted" style={{ fontSize: "0.86rem" }}>
              O float é mostrado com 6 casas para expor a fração binária que o COBOL nunca carrega. Linhas em
              vermelho já divergem em pelo menos 1 centavo.
            </p>
            <table>
              <thead><tr><th>Nº</th><th>Juros (COBOL)</th><th>Juros (float)</th><th>Δ (centavos)</th></tr></thead>
              <tbody>
                {cobol.parcelas.map((p, k) => {
                  const jc = Number(p.juros), jf = Number(flt.parcelas[k].juros);
                  const d = jf - jc;
                  const diverge = jc.toFixed(2) !== jf.toFixed(2);
                  return (
                    <tr key={p.numero} style={diverge ? { background: "rgba(251,113,133,0.08)" } : {}}>
                      <td>{p.numero}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>{brl(jc)}</td>
                      <td className="mono">{f6(jf)}</td>
                      <td className="mono" style={{ color: Math.abs(d) >= 0.005 ? "var(--neg)" : "var(--muted)" }}>
                        {d >= 0 ? "+" : "−"}{cent(Math.abs(d))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="muted" style={{ fontSize: "0.82rem", maxWidth: 760 }}>
            Parece pouco — centavos. Mas o erro é <strong>sistemático</strong> e <strong>acumula</strong>: multiplique
            por milhões de contratos e por milhares de fechamentos, e o float quebra a reconciliação contábil. Por
            isso a regra financeira mora no COBOL decimal, e não em <code>double</code>.
          </p>
        </>
      )}

      <style>{`
        .prova-glitch { font-family: monospace; font-size: 0.95rem; }
        .prova-glitch code { background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 6px; }
        td.mono, .mono { font-family: monospace; font-size: 0.82rem; font-variant-numeric: tabular-nums; }
      `}</style>
    </>
  );
}
