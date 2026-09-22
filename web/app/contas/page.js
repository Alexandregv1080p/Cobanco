"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, brl } from "../../lib/api";
import { useRequireAuth, getUser } from "../../lib/auth";
import { mascaraNumeroConta, MAX_MONEY } from "../../lib/validacao";
import CampoMoeda from "../CampoMoeda";

export default function ContasPage() {
  useRequireAuth();
  const [user, setUser] = useState(null);
  const [contas, setContas] = useState([]);
  const [form, setForm] = useState({ numero: "", limite: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const isAdmin = user?.papel === "ADMIN";

  async function recarregar() {
    try {
      setContas(await api.listarContas());
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => {
    setUser(getUser());
    recarregar();
  }, []);

  async function criar(e) {
    e.preventDefault();
    setErro("");
    if (!/^[A-Z0-9-]{3,20}$/.test(form.numero)) {
      setErro("número da conta: 3 a 20 caracteres (letras, números ou hífen)");
      return;
    }
    const lim = Number(form.limite) || 0;
    if (lim < 0 || lim > MAX_MONEY) {
      setErro("limite inválido");
      return;
    }
    setCarregando(true);
    try {
      await api.criarConta({
        clienteId: user.clienteId,
        numero: form.numero,
        limite: lim,
      });
      setForm({ numero: "", limite: "" });
      await recarregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <h1>{isAdmin ? "Todas as contas" : "Minhas contas"}</h1>

      {user?.clienteId && (
        <div className="card">
          <h2>Nova conta</h2>
          <form onSubmit={criar}>
            <div className="row">
              <div>
                <label>Número da conta</label>
                <input value={form.numero} maxLength={20} placeholder="ex.: CC-1024"
                       onChange={(e) => setForm({ ...form, numero: mascaraNumeroConta(e.target.value) })} required />
              </div>
              <div>
                <label>Limite (cheque especial)</label>
                <CampoMoeda value={form.limite} onChange={(v) => setForm({ ...form, limite: v })} />
              </div>
            </div>
            <button disabled={carregando}>{carregando ? "Criando..." : "Criar conta"}</button>
            {erro && <div className="erro">{erro}</div>}
          </form>
        </div>
      )}

      <div className="card">
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
    </>
  );
}
