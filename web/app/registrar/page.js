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

    const digitos = form.documento.replace(/\D/g, "").length;
    if (pj ? digitos !== 14 : digitos !== 11) {
      setErro(pj ? "CNPJ deve ter 14 dígitos" : "CPF deve ter 11 dígitos");
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.senha)) {
      setErro("senha deve ter ao menos 8 caracteres, com letras e números");
      return;
    }
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
      <div className="logo">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary-2)" strokeWidth="1.6"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10l9-6 9 6" /><path d="M5 10v9" /><path d="M9 10v9" /><path d="M15 10v9" />
          <path d="M19 10v9" /><path d="M3 21h18" />
        </svg>
      </div>
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
          <input value={form.nome} maxLength={120} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />

          <label>{pj ? "CNPJ" : "CPF"}</label>
          <input value={form.documento} maxLength={18} inputMode="numeric"
                 placeholder={pj ? "00.000.000/0000-00" : "000.000.000-00"}
                 onChange={(e) => setForm({ ...form, documento: e.target.value })} required />

          <label>Telefone</label>
          <PhoneInput
            international
            defaultCountry="BR"
            value={telefone}
            onChange={(v) => setTelefone(v || "")}
            placeholder="Número com DDD"
          />

          <label>E-mail</label>
          <input type="email" value={form.email} maxLength={180} onChange={(e) => setForm({ ...form, email: e.target.value })} required />

          <div className="row">
            <div>
              <label>Senha</label>
              <input type="password" value={form.senha} minLength={8} maxLength={72}
                     onChange={(e) => setForm({ ...form, senha: e.target.value })} required />
            </div>
            <div>
              <label>Confirmar senha</label>
              <input type="password" value={form.confirmar} maxLength={72}
                     onChange={(e) => setForm({ ...form, confirmar: e.target.value })} required />
            </div>
          </div>
          <div className="muted" style={{ fontSize: "0.78rem", marginTop: 6 }}>
            Mínimo 8 caracteres, com letras e números.
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
