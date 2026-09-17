"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, brl } from "../../lib/api";
import { useRequireAuth, getUser } from "../../lib/auth";

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
    setCarregando(true);
    try {
      await api.criarConta({
        clienteId: user.clienteId,
        numero: form.numero,
        limite: form.limite ? Number(form.limite) : 0,
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
