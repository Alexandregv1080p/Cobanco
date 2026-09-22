"use client";

import { useState } from "react";
import { api, brl } from "../../lib/api";
import { useRequireAuth } from "../../lib/auth";

const pct = (v) => (Number(v) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";

// cor por faixa de risco (A melhor → D pior)
const CORES = { A: "#34d399", B: "#14b8a6", C: "#fbbf24", D: "#fb7185" };

export default function CreditoPage() {
  useRequireAuth();
  const [form, setForm] = useState({ renda: "6000", valor: "40000", prazoMeses: "36", saldoMedio: "5000" });
  const [res, setRes] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function analisar(e) {
    e.preventDefault();
    setErro(""); setRes(null); setCarregando(true);
    try {
      const r = await api.analisarCredito({
        renda: Number(form.renda), valor: Number(form.valor),
        prazoMeses: Number(form.prazoMeses), saldoMedio: Number(form.saldoMedio),
      });
      setRes(r);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  const cor = res ? (CORES[res.faixa] || "#8fa8a0") : "#8fa8a0";

  return (
    <>
      <h1>Motor de Crédito</h1>
      <p className="muted" style={{ maxWidth: 760 }}>
        Antes de liberar um empréstimo, o núcleo <strong>COBOL</strong> (<code>CREDITO.COB</code>) roda um
        <strong> motor de regras</strong>: pontua o pedido (0–1000) a partir do comprometimento da renda, reserva
        financeira, renda e prazo, e devolve a <strong>decisão</strong>, a <strong>faixa de risco</strong>, a taxa
        sugerida e o <strong>limite</strong> que a renda comporta. É o tipo de regra de negócio que vive no core bancário.
      </p>

      {/* Entradas */}
      <div className="card">
        <form onSubmit={analisar}>
          <div className="row">
            <div>
              <label>Renda mensal</label>
              <input type="number" step="0.01" value={form.renda}
                onChange={(e) => setForm({ ...form, renda: e.target.value })} required />
            </div>
            <div>
              <label>Valor solicitado</label>
              <input type="number" step="0.01" value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Prazo (meses)</label>
              <input type="number" min="1" max="360" value={form.prazoMeses}
                onChange={(e) => setForm({ ...form, prazoMeses: e.target.value })} required />
            </div>
            <div>
              <label>Saldo médio em conta</label>
              <input type="number" step="0.01" value={form.saldoMedio}
                onChange={(e) => setForm({ ...form, saldoMedio: e.target.value })} required />
            </div>
          </div>
          <button style={{ width: "100%" }} disabled={carregando}>
            {carregando ? "Analisando…" : "Analisar crédito"}
          </button>
          {erro && <div className="erro">{erro}</div>}
        </form>
      </div>

      {res && (
        <>
          {/* Veredito */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 auto", textAlign: "center" }}>
                <div style={{ fontSize: "3rem", fontWeight: 800, color: cor, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {res.score}
                </div>
                <div className="muted" style={{ fontSize: "0.75rem", letterSpacing: "0.05em" }}>SCORE / 1000</div>
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span className="cr-badge" style={{ background: cor + "22", color: cor, border: `1px solid ${cor}` }}>
                    {res.decisao}
                  </span>
                  <span className="muted">Faixa de risco <strong style={{ color: cor }}>{res.faixa}</strong></span>
                </div>
                {/* Barra do score com marcos das faixas */}
                <div className="cr-track">
                  <div className="cr-fill" style={{ width: `${res.score / 10}%`, background: cor }} />
                  {[480, 600, 720].map((m) => (
                    <div key={m} className="cr-tick" style={{ left: `${m / 10}%` }} title={`corte ${m}`} />
                  ))}
                </div>
                <div className="muted" style={{ fontSize: "0.75rem", marginTop: 4 }}>
                  Cortes: 480 (revisar) · 600 (aprovado B) · 720 (aprovado A)
                </div>
              </div>
            </div>
          </div>

          {/* Números */}
          <div className="stats">
            <div className="stat">
              <div className="k">Limite sugerido</div>
              <div className="v" style={{ color: cor }}>{brl(res.limiteSugerido)}</div>
              <div className="s">capacidade: {brl(res.capacidade)}</div>
            </div>
            <div className="stat">
              <div className="k">Taxa sugerida</div>
              <div className="v">{Number(res.taxaSugerida) > 0 ? pct(res.taxaSugerida) + " a.m." : "—"}</div>
              <div className="s">por faixa de risco</div>
            </div>
            <div className="stat">
              <div className="k">Comprometimento</div>
              <div className={"v " + (Number(res.comprometimento) > 0.5 ? "neg" : "")}>{pct(res.comprometimento)}</div>
              <div className="s">parcela est.: {brl(res.parcelaEstimada)}</div>
            </div>
          </div>

          {/* Fatores do score */}
          <div className="card">
            <h2>Como o score foi formado</h2>
            <p className="muted" style={{ fontSize: "0.86rem" }}>Base 500 pontos, ajustada por cada fator:</p>
            <table>
              <thead><tr><th>Fator</th><th>Impacto</th></tr></thead>
              <tbody>
                <tr>
                  <td>Base</td>
                  <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>500</td>
                </tr>
                {res.fatores.map((f, i) => (
                  <tr key={i}>
                    <td>{f.nome}</td>
                    <td style={{ color: f.pontos > 0 ? "var(--pos)" : f.pontos < 0 ? "var(--neg)" : "var(--muted)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {f.pontos > 0 ? "+" : ""}{f.pontos}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ fontWeight: 700 }}>Score final</td>
                  <td style={{ fontWeight: 800, color: cor, fontVariantNumeric: "tabular-nums" }}>{res.score}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{`
        .cr-badge { padding: 4px 12px; border-radius: 999px; font-weight: 800; font-size: 0.82rem; letter-spacing: 0.03em; }
        .cr-track {
          position: relative; height: 12px; border-radius: 999px;
          background: rgba(255,255,255,0.06); overflow: hidden;
        }
        .cr-fill { height: 100%; border-radius: 999px; transition: width 0.5s ease; }
        .cr-tick {
          position: absolute; top: -2px; width: 2px; height: 16px;
          background: rgba(255,255,255,0.35);
        }
      `}</style>
    </>
  );
}
