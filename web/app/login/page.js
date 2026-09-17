"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { setSession } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      setSession(await api.login(form));
      router.push("/");
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="auth">
      <div className="logo">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary-2)" strokeWidth="1.6"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10l9-6 9 6" /><path d="M5 10v9" /><path d="M9 10v9" /><path d="M15 10v9" />
          <path d="M19 10v9" /><path d="M3 21h18" />
        </svg>
      </div>
      <h1>Core Bancário</h1>
      <p className="sub">Núcleo financeiro em COBOL, modernizado</p>
      <div className="card">
        <form onSubmit={entrar}>
          <label>E-mail</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <label>Senha</label>
          <input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required />
          <button disabled={carregando}>{carregando ? "Entrando…" : "Entrar"}</button>
          {erro && <div className="erro">{erro}</div>}
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          Não tem conta? <Link href="/registrar">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
