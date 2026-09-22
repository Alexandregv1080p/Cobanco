"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, brl } from "../lib/api";
import { useRequireAuth, getUser } from "../lib/auth";
import ModalFechamento from "./ModalFechamento";

export default function DashboardPage() {
  useRequireAuth();
  const [user, setUser] = useState(null);
  const [contas, setContas] = useState([]);
  const [balancete, setBalancete] = useState(null);
  const [fech, setFech] = useState(null);
  const [modalFech, setModalFech] = useState(false);
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

  async function aoConcluirFechamento(r) {
    setFech(r);
    await recarregar(user);
  }

  const saldoTotal = contas.reduce((s, c) => s + Number(c.saldo), 0);
  const limiteTotal = contas.reduce((s, c) => s + Number(c.limite), 0);

  const topContas = [...contas]
    .sort((a, b) => Math.abs(Number(b.saldo)) - Math.abs(Number(a.saldo)))
    .slice(0, 8);
  const maxAbs = Math.max(1, ...topContas.map((c) => Math.abs(Number(c.saldo))));

  return (
    <>
      <h1>Olá, {user?.nome || "bem-vindo"}</h1>
      <p className="page-sub">
        {isAdmin ? "Visão geral do banco em tempo real." : "Suas contas e simulações num só lugar."}
      </p>

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

      {topContas.length > 0 && (
        <div className="card">
          <h2>Saldos por conta</h2>
          <div className="chart">
            {topContas.map((c) => {
              const v = Number(c.saldo);
              const w = (Math.abs(v) / maxAbs) * 100;
              return (
                <div className="bar-row" key={c.id}>
                  <div className="lbl">{c.numero}</div>
                  <div className="bar-track">
                    <div className={"bar-fill" + (v < 0 ? " neg" : "")} style={{ width: `${w}%` }} />
                  </div>
                  <div className="val">{brl(v)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          <button onClick={() => setModalFech(true)}>Rodar fechamento agora</button>
          <ModalFechamento open={modalFech} onClose={() => setModalFech(false)} onDone={aoConcluirFechamento} />
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
