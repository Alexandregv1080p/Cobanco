"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PhoneInput from "react-phone-number-input";
import { api } from "../../lib/api";
import { setSession } from "../../lib/auth";

export default function RegistrarPage() {
  const router = useRouter();
  const [tipo, setTipo] = useState("FISICA");
  const [form, setForm] = useState({ nome: "", documento: "", email: "", senha: "", confirmar: "" });
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const pj = tipo === "JURIDICA";

  async function criar(e) {
    e.preventDefault();
    setErro("");
    if (form.senha !== form.confirmar) {
      setErro("as senhas não conferem");
      return;
    }
    if (!telefone) {
      setErro("informe um telefone");
      return;
    }
    setCarregando(true);
    try {
      setSession(await api.registrar({
        tipo,
        nome: form.nome,
        documento: form.documento,
        telefone,
        email: form.email,
        senha: form.senha,
      }));
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
          <label>Tipo de conta</label>
          <div className="seg">
            <button type="button" className={!pj ? "on" : ""} onClick={() => setTipo("FISICA")}>
              Pessoa física
            </button>
            <button type="button" className={pj ? "on" : ""} onClick={() => setTipo("JURIDICA")}>
              Pessoa jurídica
            </button>
          </div>

          <label>{pj ? "Razão social" : "Nome completo"}</label>
          <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />

          <label>{pj ? "CNPJ" : "CPF"}</label>
          <input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} required />

          <label>Telefone</label>
          <PhoneInput
            international
            defaultCountry="BR"
            value={telefone}
            onChange={(v) => setTelefone(v || "")}
            placeholder="Número com DDD"
          />

          <label>E-mail</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />

          <div className="row">
            <div>
              <label>Senha (mín. 6)</label>
              <input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required />
            </div>
            <div>
              <label>Confirmar senha</label>
              <input type="password" value={form.confirmar} onChange={(e) => setForm({ ...form, confirmar: e.target.value })} required />
            </div>
          </div>

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
