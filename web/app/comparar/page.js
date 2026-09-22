"use client";

import { useState } from "react";
import { api, brl } from "../../lib/api";
import { useRequireAuth } from "../../lib/auth";

const pct = (v) => (Number(v) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";

// Tabela de IR regressivo (a mesma do INVESTIMENTO.COB) — só para referência visual
const FAIXAS_IR = [
  { ate: 180, aliq: 0.225, label: "até 180 dias" },
  { ate: 360, aliq: 0.200, label: "181 a 360 dias" },
  { ate: 720, aliq: 0.175, label: "361 a 720 dias" },
  { ate: Infinity, aliq: 0.150, label: "acima de 720 dias" },
];

// Gráfico de 2 séries em SVG (mesma escala) — ambas vêm do COBOL
function DualChart({ a, b, corA = "var(--primary-2)", corB = "var(--muted)", altura = 170 }) {
  const A = (a || []).map(Number), B = (b || []).map(Number);
  if (A.length < 2) return null;
  const W = 640, H = altura, P = 6;
  const all = [...A, ...B];
  const lo = Math.min(...all), hi = Math.max(...all), range = hi - lo || 1;
  const x = (i, n) => P + (i / (n - 1)) * (W - 2 * P);
  const y = (v) => H - P - ((v - lo) / range) * (H - 2 * P);
  const poly = (arr) => arr.map((v, i) => `${x(i, arr.length).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={altura} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={poly(B)} fill="none" stroke={corB} strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
      <polyline points={poly(A)} fill="none" stroke={corA} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function CompararPage() {
  useRequireAuth();
  const [form, setForm] = useState({ valor: "10000", meses: "24", taxaCDB: "0.01", taxaPoup: "0.005" });
  const [cdb, setCdb] = useState(null);
  const [poup, setPoup] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function comparar(e) {
    e.preventDefault();
    setErro(""); setCdb(null); setPoup(null); setCarregando(true);
    const base = { valor: Number(form.valor), meses: Number(form.meses) };
    try {
      const [rc, rp] = await Promise.all([
        api.simularInvestimento({ tipo: "CDB", taxaMensal: Number(form.taxaCDB), ...base }),
        api.simularInvestimento({ tipo: "POUPANCA", taxaMensal: Number(form.taxaPoup), ...base }),
      ]);
      setCdb(rc); setPoup(rp);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  const diff = cdb && poup ? Number(cdb.valorFinalLiquido) - Number(poup.valorFinalLiquido) : 0;
  const cdbGanha = diff >= 0;
  const dias = Number(form.meses) * 30;
  const faixaAtual = FAIXAS_IR.find((f) => dias <= f.ate);

  return (
    <>
      <h1>Comparador de Investimentos</h1>
      <p className="muted" style={{ maxWidth: 760 }}>
        O mesmo aporte e prazo em <strong>CDB</strong> (tributado, IR regressivo) e <strong>Poupança</strong>
        (isenta) — cada um calculado pelo núcleo <strong>COBOL</strong>. O CDB rende mais bruto, mas o
        <strong> imposto</strong> come parte do ganho; nos prazos curtos a alíquota é maior. Veja quem sobra na frente.
      </p>

      {/* Entradas */}
      <div className="card">
        <form onSubmit={comparar}>
          <div className="row">
            <div>
              <label>Valor aplicado</label>
              <input type="number" step="0.01" value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
            </div>
            <div>
              <label>Prazo (meses)</label>
              <input type="number" min="1" max="360" value={form.meses}
                onChange={(e) => setForm({ ...form, meses: e.target.value })} required />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Taxa do CDB (mensal, ex.: 0.01 = 1%)</label>
              <input type="number" step="0.0001" value={form.taxaCDB}
                onChange={(e) => setForm({ ...form, taxaCDB: e.target.value })} required />
            </div>
            <div>
              <label>Taxa da Poupança (mensal, ex.: 0.005 = 0,5%)</label>
              <input type="number" step="0.0001" value={form.taxaPoup}
                onChange={(e) => setForm({ ...form, taxaPoup: e.target.value })} required />
            </div>
          </div>
          <button style={{ width: "100%" }} disabled={carregando}>
            {carregando ? "Comparando…" : "Comparar"}
          </button>
          {erro && <div className="erro">{erro}</div>}
        </form>
      </div>

      {cdb && poup && (
        <>
          {/* Veredito */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span className="cmp-badge" style={{
                background: (cdbGanha ? "var(--primary-2)" : "var(--muted)") + "22",
                color: cdbGanha ? "var(--primary-2)" : "var(--text)",
                border: `1px solid ${cdbGanha ? "var(--primary-2)" : "var(--muted)"}`,
              }}>
                Vence: {cdbGanha ? "CDB" : "Poupança"}
              </span>
              <div className="muted">
                Vantagem líquida de <strong style={{ color: cdbGanha ? "var(--pos)" : "var(--text)" }}>{brl(Math.abs(diff))}</strong> em {form.meses} meses
                &nbsp;·&nbsp; IR do CDB neste prazo: <strong>{pct(cdb.aliquotaIR)}</strong> <span className="muted">({faixaAtual?.label})</span>
              </div>
            </div>
          </div>

          {/* Cards lado a lado */}
          <div className="row">
            <div className="card" style={{ borderTop: "3px solid var(--primary-2)" }}>
              <h2>CDB <span className="muted" style={{ fontSize: "0.6em" }}>tributado</span></h2>
              <div className="saldo">{brl(cdb.valorFinalLiquido)}</div>
              <div className="muted">valor final líquido</div>
              <div style={{ marginTop: 12 }}>
                <div className="pg-info-row"><span className="muted">Rendimento bruto</span><span>{brl(cdb.rendimentoBruto)}</span></div>
                <div className="pg-info-row"><span className="muted">Alíquota IR</span><span className="neg">{pct(cdb.aliquotaIR)}</span></div>
                <div className="pg-info-row"><span className="muted">IR retido</span><span className="neg">− {brl(cdb.ir)}</span></div>
                <div className="pg-info-row" style={{ borderBottom: "none" }}><span className="muted">Rendimento líquido</span><span className="pos">{brl(cdb.rendimentoLiquido)}</span></div>
              </div>
            </div>

            <div className="card" style={{ borderTop: "3px solid var(--muted)" }}>
              <h2>Poupança <span className="muted" style={{ fontSize: "0.6em" }}>isenta</span></h2>
              <div className="saldo">{brl(poup.valorFinalLiquido)}</div>
              <div className="muted">valor final líquido</div>
              <div style={{ marginTop: 12 }}>
                <div className="pg-info-row"><span className="muted">Rendimento bruto</span><span>{brl(poup.rendimentoBruto)}</span></div>
                <div className="pg-info-row"><span className="muted">Alíquota IR</span><span>isento</span></div>
                <div className="pg-info-row"><span className="muted">IR retido</span><span>R$ 0,00</span></div>
                <div className="pg-info-row" style={{ borderBottom: "none" }}><span className="muted">Rendimento líquido</span><span className="pos">{brl(poup.rendimentoLiquido)}</span></div>
              </div>
            </div>
          </div>

          {/* Curvas */}
          <div className="card">
            <h2>Evolução do saldo (bruto)</h2>
            <div style={{ display: "flex", gap: 18, fontSize: "0.82rem", marginBottom: 6 }}>
              <span style={{ color: "var(--primary-2)" }}>━ CDB</span>
              <span className="muted">╌ Poupança</span>
            </div>
            <DualChart a={cdb.evolucao.map((p) => p.saldoBruto)} b={poup.evolucao.map((p) => p.saldoBruto)} />
          </div>

          {/* IR regressivo */}
          <div className="card">
            <h2>Imposto de Renda regressivo (CDB)</h2>
            <p className="muted" style={{ fontSize: "0.86rem" }}>
              Quanto mais tempo aplicado, menor o IR sobre o rendimento. A faixa deste prazo ({dias} dias) está destacada.
            </p>
            <table>
              <thead><tr><th>Prazo</th><th>Alíquota</th></tr></thead>
              <tbody>
                {FAIXAS_IR.map((f) => {
                  const atual = f.label === faixaAtual?.label;
                  return (
                    <tr key={f.label} style={atual ? { background: "rgba(20,184,166,0.10)" } : {}}>
                      <td>{f.label} {atual && <span className="tag" style={{ color: "var(--primary-2)" }}>este prazo</span>}</td>
                      <td style={{ fontWeight: atual ? 800 : 400 }}>{pct(f.aliq)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{`
        .cmp-badge { padding: 5px 14px; border-radius: 999px; font-weight: 800; font-size: 0.9rem; letter-spacing: 0.02em; }
        .pg-info-row { display: flex; justify-content: space-between; align-items: center;
                       padding: 8px 0; border-bottom: 1px solid var(--border-soft); font-size: 0.88rem; font-variant-numeric: tabular-nums; }
        .pg-info-row .pos { color: var(--pos); font-weight: 700; }
        .pg-info-row .neg { color: var(--neg); }
      `}</style>
    </>
  );
}
