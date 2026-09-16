"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { setSession } from "../../lib/auth";

export default function RegistrarPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: "", cpf: "", email: "", senha: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function criar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      setSession(await api.registrar(form));   // registro já loga
      router.push("/");
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="auth">
      <div className="logo">🏦</div>
      <h1>Criar conta</h1>
      <p className="sub">Abra sua conta no Core Bancário</p>
      <div className="card">
        <form onSubmit={criar}>
          <label>Nome</label>
          <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          <label>CPF</label>
          <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} required />
          <label>E-mail</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <label>Senha (mín. 6 caracteres)</label>
          <input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required />
          <button disabled={carregando}>{carregando ? "Criando…" : "Criar conta"}</button>
          {erro && <div className="erro">{erro}</div>}
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
