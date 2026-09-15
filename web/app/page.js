"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, brl } from "../lib/api";

export default function ContasPage() {
  const [contas, setContas] = useState([]);
  const [balancete, setBalancete] = useState(null);
  const [fech, setFech] = useState(null);
  const [form, setForm] = useState({ nome: "", cpf: "", numero: "", limite: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function rodarFechamento() {
    setErro("");
    try {
      setFech(await api.fechamento());
      await recarregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function recarregar() {
    try {
      const [cs, bal] = await Promise.all([api.listarContas(), api.balancete()]);
      setContas(cs);
      setBalancete(bal);
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => {
    recarregar();
  }, []);

  async function criar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      // Cria o cliente e, em seguida, a conta dele.
      const cliente = await api.criarCliente({ nome: form.nome, cpf: form.cpf });
      await api.criarConta({
        clienteId: cliente.id,
        numero: form.numero,
        limite: form.limite ? Number(form.limite) : 0,
      });
      setForm({ nome: "", cpf: "", numero: "", limite: "" });
      await recarregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <h1>Contas</h1>

      <div className="card">
        <h2>Nova conta</h2>
        <form onSubmit={criar}>
          <div className="row">
            <div>
              <label>Nome do cliente</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </div>
            <div>
              <label>CPF</label>
              <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} required />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Número da conta</label>
              <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} required />
            </div>
            <div>
              <label>Limite (cheque especial)</label>
              <input type="number" step="0.01" min="0" value={form.limite}
                     onChange={(e) => setForm({ ...form, limite: e.target.value })} />
            </div>
          </div>
          <button disabled={carregando}>{carregando ? "Criando..." : "Criar conta"}</button>
          {erro && <div className="erro">{erro}</div>}
        </form>
      </div>

      <div className="card">
        <h2>Contas cadastradas</h2>
        {contas.length === 0 ? (
          <p className="muted">Nenhuma conta ainda.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Conta</th><th>Titular</th><th>Limite</th><th>Saldo</th></tr>
            </thead>
            <tbody>
              {contas.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/contas/${c.id}`}>{c.numero}</Link></td>
                  <td>{c.clienteNome}</td>
                  <td>{brl(c.limite)}</td>
                  <td>{brl(c.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {balancete && (
        <div className="card">
          <h2>Balancete <span className="muted" style={{ fontSize: "0.6em" }}>(razão de partidas dobradas)</span></h2>
          <div className="row">
            <div className="muted">Total débitos: <strong>{brl(balancete.totalDebitos)}</strong></div>
            <div className="muted">Total créditos: <strong>{brl(balancete.totalCreditos)}</strong></div>
            <div className="muted">Caixa do banco: <strong>{brl(balancete.saldoCaixa)}</strong></div>
          </div>
          <p className={balancete.equilibrado ? "ok" : "erro"}>
            {balancete.equilibrado ? "✓ Livros equilibrados (débitos = créditos)" : "✗ Livros desequilibrados"}
          </p>
        </div>
      )}

      <div className="card">
        <h2>Fechamento diário <span className="muted" style={{ fontSize: "0.6em" }}>(batch COBOL)</span></h2>
        <p className="muted">
          Cobra juros de cheque especial nas contas negativas e reconcilia saldo × razão.
          Roda automaticamente à meia-noite; aqui você dispara sob demanda.
        </p>
        <button onClick={rodarFechamento}>Rodar fechamento agora</button>
        {fech && (
          <p className="ok">
            {fech.contasProcessadas} contas processadas · juros cobrados {brl(fech.totalJuros)} ·{" "}
            <span className={fech.divergencias === 0 ? "ok" : "erro"}>
              {fech.divergencias} divergência(s) de reconciliação
            </span>
          </p>
        )}
      </div>
    </>
  );
}
