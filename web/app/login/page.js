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
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1>Entrar</h1>
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
