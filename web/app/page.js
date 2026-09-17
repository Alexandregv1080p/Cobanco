"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, brl } from "../lib/api";
import { useRequireAuth, getUser } from "../lib/auth";

export default function DashboardPage() {
  useRequireAuth();
  const [user, setUser] = useState(null);
  const [contas, setContas] = useState([]);
  const [balancete, setBalancete] = useState(null);
  const [fech, setFech] = useState(null);
  const [erro, setErro] = useState("");

  const isAdmin = user?.papel === "ADMIN";

  async function recarregar(u) {
    try {
      const cs = await api.listarContas();
      setContas(cs);
      if (u?.papel === "ADMIN") setBalancete(await api.balancete());
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => {
    const u = getUser();
    setUser(u);
    recarregar(u);
  }, []);

  async function rodarFechamento() {
    setErro("");
    try {
      setFech(await api.fechamento());
      await recarregar(user);
    } catch (e) {
      setErro(e.message);
    }
  }

  const saldoTotal = contas.reduce((s, c) => s + Number(c.saldo), 0);
  const limiteTotal = contas.reduce((s, c) => s + Number(c.limite), 0);

  return (
    <>
      <h1>Olá, {user?.nome || "bem-vindo"}</h1>

      <div className="stats">
        {isAdmin ? (
          <>
            <div className="stat">
              <div className="k">Contas no banco</div>
              <div className="v">{contas.length}</div>
            </div>
            <div className="stat">
              <div className="k">Caixa do banco</div>
              <div className="v">{balancete ? brl(balancete.saldoCaixa) : "—"}</div>
            </div>
            <div className="stat">
              <div className="k">Livros contábeis</div>
              <div className={"v " + (balancete?.equilibrado ? "pos" : "neg")}>
                {balancete ? (balancete.equilibrado ? "Equilibrado" : "Divergente") : "—"}
              </div>
              {balancete && <div className="s">déb. {brl(balancete.totalDebitos)} = créd. {brl(balancete.totalCreditos)}</div>}
            </div>
          </>
        ) : (
          <>
            <div className="stat">
              <div className="k">Saldo total</div>
              <div className={"v " + (saldoTotal < 0 ? "neg" : "pos")}>{brl(saldoTotal)}</div>
            </div>
            <div className="stat">
              <div className="k">Minhas contas</div>
              <div className="v">{contas.length}</div>
            </div>
            <div className="stat">
              <div className="k">Limite total</div>
              <div className="v">{brl(limiteTotal)}</div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Ações rápidas</h2>
        <div className="quick">
          <Link href="/contas">Ver contas</Link>
          <Link href="/emprestimos">Simular empréstimo</Link>
          <Link href="/investimentos">Simular investimento</Link>
        </div>
      </div>

      {isAdmin && (
        <div className="card">
          <h2>Fechamento diário <span className="muted" style={{ fontSize: "0.6em" }}>(batch COBOL)</span></h2>
          <p className="muted">
            Cobra juros de cheque especial nas contas negativas e reconcilia saldo × razão.
          </p>
          <button onClick={rodarFechamento}>Rodar fechamento agora</button>
          {fech && (
            <p className="ok">
              {fech.contasProcessadas} contas · juros {brl(fech.totalJuros)} ·{" "}
              <span className={fech.divergencias === 0 ? "ok" : "erro"}>
                {fech.divergencias} divergência(s)
              </span>
            </p>
          )}
        </div>
      )}

      <div className="card">
        <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {isAdmin ? "Contas recentes" : "Minhas contas"}
          <Link href="/contas" style={{ fontSize: "0.75rem", fontWeight: 500 }}>ver todas →</Link>
        </h2>
        {erro && <div className="erro">{erro}</div>}
        {contas.length === 0 ? (
          <p className="muted">Nenhuma conta ainda. <Link href="/contas">Criar a primeira</Link>.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Conta</th><th>Titular</th><th>Saldo</th></tr>
            </thead>
            <tbody>
              {contas.slice(0, 6).map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/contas/${c.id}`}>{c.numero}</Link></td>
                  <td>{c.clienteNome}</td>
                  <td>{brl(c.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
