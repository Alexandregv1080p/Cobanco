"use client";

import { useEffect, useState } from "react";
import { api, brl } from "../../lib/api";
import { useRequireAuth, getUser } from "../../lib/auth";

export default function ContabilPage() {
  useRequireAuth();
  const [admin, setAdmin] = useState(null);
  const [bal, setBal] = useState(null);     // balancete (backend)
  const [contas, setContas] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const ehAdmin = getUser()?.papel === "ADMIN";
    setAdmin(ehAdmin);
    if (!ehAdmin) return;
    (async () => {
      try {
        const [b, cs] = await Promise.all([api.balancete(), api.listarContas()]);
        setBal(b);
        setContas(cs);
      } catch (e) {
        setErro(e.message);
      }
    })();
  }, []);

  // Agregações patrimoniais a partir dos saldos das contas de cliente
  const depositos = contas.reduce((s, c) => s + Math.max(0, Number(c.saldo)), 0);           // passivo
  const creditoConcedido = contas.reduce((s, c) => s + Math.max(0, -Number(c.saldo)), 0);   // ativo (cheque especial em uso)
  const nNegativas = contas.filter((c) => Number(c.saldo) < 0).length;

  const caixa   = bal ? Number(bal.saldoCaixa) : 0;
  const ativo   = caixa + creditoConcedido;
  const passivo = depositos;
  const pl      = ativo - passivo;   // patrimônio líquido = resíduo (Ativo = Passivo + PL)

  if (admin === false) {
    return (
      <>
        <h1>Painel Contábil</h1>
        <div className="card">
          <p className="muted">⚠️ Esta área é restrita ao perfil <strong>ADMIN</strong>. Faça login como administrador.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Painel Contábil</h1>
      <p className="muted" style={{ maxWidth: 760 }}>
        A mesma movimentação vista pela ótica do <strong>contador</strong>. Toda operação é registrada em
        <strong> partidas dobradas</strong> no razão; aqui provamos que os livros fecham (<strong>balancete</strong>)
        e montamos a <strong>posição patrimonial</strong> do banco.
      </p>

      {erro && <div className="card"><div className="erro">{erro}</div></div>}

      {bal && (
        <>
          {/* Balancete — a prova real */}
          <div className="card">
            <h2>
              Balancete{" "}
              <span className="tag" style={{ color: bal.equilibrado ? "var(--pos)" : "var(--neg)" }}>
                {bal.equilibrado ? "✓ livros equilibrados" : "✗ desequilibrado"}
              </span>
            </h2>
            <p className="muted" style={{ fontSize: "0.86rem" }}>
              Em partidas dobradas, todo débito tem um crédito de igual valor — então o total de débitos
              precisa bater com o de créditos. É a prova de que a contabilidade está íntegra.
            </p>
            <div className="ct-prova">
              <div className="ct-lado">
                <div className="ct-lbl">Total de débitos</div>
                <div className="ct-val">{brl(bal.totalDebitos)}</div>
              </div>
              <div className="ct-eq" style={{ color: bal.equilibrado ? "var(--pos)" : "var(--neg)" }}>
                {bal.equilibrado ? "=" : "≠"}
              </div>
              <div className="ct-lado">
                <div className="ct-lbl">Total de créditos</div>
                <div className="ct-val">{brl(bal.totalCreditos)}</div>
              </div>
            </div>
          </div>

          {/* Balanço patrimonial */}
          <div className="card">
            <h2>Posição patrimonial do banco</h2>
            <p className="muted" style={{ fontSize: "0.86rem" }}>
              Leitura bancária: o dinheiro que o cliente deposita é <strong>passivo</strong> (dívida do banco com
              o cliente); o limite de cheque especial em uso é <strong>ativo</strong> (um recebível). O que sobra é
              o <strong>patrimônio líquido</strong>.
            </p>

            <div className="ct-balanco">
              {/* ATIVO */}
              <div className="ct-col">
                <div className="ct-col-h ct-ativo">ATIVO</div>
                <table>
                  <tbody>
                    <tr><td>Caixa (líquido do razão)</td><td className="ct-num">{brl(caixa)}</td></tr>
                    <tr><td>Crédito concedido <span className="muted">({nNegativas} conta(s) no limite)</span></td><td className="ct-num">{brl(creditoConcedido)}</td></tr>
                    <tr className="ct-total"><td>Total do ativo</td><td className="ct-num">{brl(ativo)}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* PASSIVO + PL */}
              <div className="ct-col">
                <div className="ct-col-h ct-passivo">PASSIVO + PATRIMÔNIO</div>
                <table>
                  <tbody>
                    <tr><td>Depósitos de clientes</td><td className="ct-num">{brl(passivo)}</td></tr>
                    <tr><td>Patrimônio líquido</td><td className="ct-num" style={{ color: pl < 0 ? "var(--neg)" : "var(--pos)" }}>{brl(pl)}</td></tr>
                    <tr className="ct-total"><td>Total</td><td className="ct-num">{brl(passivo + pl)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p className="muted" style={{ fontSize: "0.78rem", marginTop: 4 }}>
              Por definição, <strong>Ativo = Passivo + Patrimônio Líquido</strong> — os dois lados sempre fecham.
            </p>
          </div>

          {/* Resumo */}
          <div className="stats">
            <div className="stat">
              <div className="k">Depósitos de clientes</div>
              <div className="v">{brl(depositos)}</div>
              <div className="s">passivo do banco</div>
            </div>
            <div className="stat">
              <div className="k">Crédito concedido</div>
              <div className="v neg">{brl(creditoConcedido)}</div>
              <div className="s">cheque especial em uso</div>
            </div>
            <div className="stat">
              <div className="k">Patrimônio líquido</div>
              <div className={"v " + (pl < 0 ? "neg" : "pos")}>{brl(pl)}</div>
              <div className="s">ativo − passivo</div>
            </div>
          </div>
        </>
      )}

      <style>{`
        .ct-prova { display: flex; align-items: stretch; gap: 16px; margin-top: 8px; }
        .ct-lado { flex: 1; background: rgba(0,0,0,0.25); border: 1px solid var(--border-soft);
                   border-radius: 12px; padding: 16px 18px; }
        .ct-lbl { color: var(--faint); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
        .ct-val { font-size: 1.4rem; font-weight: 800; margin-top: 6px; font-variant-numeric: tabular-nums; }
        .ct-eq  { display: flex; align-items: center; font-size: 1.8rem; font-weight: 800; }

        .ct-balanco { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
        @media (max-width: 720px) { .ct-balanco { grid-template-columns: 1fr; } }
        .ct-col-h { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.06em; padding: 8px 10px;
                    border-radius: 8px; margin-bottom: 6px; text-align: center; }
        .ct-ativo   { background: rgba(20,184,166,0.14); color: var(--primary-2); }
        .ct-passivo { background: rgba(251,113,133,0.12); color: var(--neg); }
        .ct-num { text-align: right; font-variant-numeric: tabular-nums; }
        .ct-total td { font-weight: 800; border-top: 2px solid var(--border); color: #fff; }
      `}</style>
    </>
  );
}
