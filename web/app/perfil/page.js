"use client";

import { useEffect, useState } from "react";
import PhoneInput from "react-phone-number-input";
import { api } from "../../lib/api";
import { useRequireAuth, setSession, getUser } from "../../lib/auth";
import { senhaForte } from "../../lib/validacao";

export default function PerfilPage() {
  useRequireAuth();
  const [perfil, setPerfil] = useState(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [msg, setMsg] = useState(null);

  // troca de senha
  const [pw, setPw] = useState({ atual: "", nova: "", conf: "" });
  const [pwMsg, setPwMsg] = useState(null);

  async function carregar() {
    try {
      const p = await api.perfil();
      setPerfil(p);
      setNome(p.nome || "");
      setEmail(p.email || "");
      setTelefone(p.telefone || "");
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  }

  useEffect(() => { carregar(); }, []);

  async function salvar(e) {
    e.preventDefault();
    setMsg(null);
    if (!nome.trim() || nome.trim().length < 3) {
      setMsg({ tipo: "erro", texto: "informe o nome" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMsg({ tipo: "erro", texto: "e-mail inválido" });
      return;
    }
    if (telefone && !/^\+?[1-9]\d{9,14}$/.test(telefone)) {
      setMsg({ tipo: "erro", texto: "telefone inválido" });
      return;
    }
    try {
      const r = await api.atualizarPerfil({ nome, email, telefone });
      const u = getUser() || {};
      setSession({ token: r.token, nome: r.nome, email: r.email, papel: r.papel, clienteId: r.clienteId ?? u.clienteId });
      setMsg({ tipo: "ok", texto: "Dados atualizados." });
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  }

  async function trocarSenha(e) {
    e.preventDefault();
    setPwMsg(null);
    if (!senhaForte(pw.nova)) {
      setPwMsg({ tipo: "erro", texto: "a nova senha deve ter de 8 a 72 caracteres, com letras e números" });
      return;
    }
    if (pw.nova === pw.atual) {
      setPwMsg({ tipo: "erro", texto: "a nova senha deve ser diferente da atual" });
      return;
    }
    if (pw.nova !== pw.conf) {
      setPwMsg({ tipo: "erro", texto: "as senhas não conferem" });
      return;
    }
    try {
      await api.trocarSenha({ senhaAtual: pw.atual, novaSenha: pw.nova });
      setPw({ atual: "", nova: "", conf: "" });
      setPwMsg({ tipo: "ok", texto: "Senha alterada." });
    } catch (e) {
      setPwMsg({ tipo: "erro", texto: e.message });
    }
  }

  if (!perfil) return <p className="muted">Carregando…</p>;

  const pj = perfil.tipo === "JURIDICA";

  return (
    <>
      <h1>Perfil</h1>

      <div className="card">
        <h2>Dados pessoais</h2>
        <form onSubmit={salvar}>
          {perfil.tipo && (
            <div className="row">
              <div>
                <label>Tipo</label>
                <input value={pj ? "Pessoa jurídica" : "Pessoa física"} disabled />
              </div>
              <div>
                <label>{pj ? "CNPJ" : "CPF"}</label>
                <input value={perfil.documento || "—"} disabled />
              </div>
            </div>
          )}

          <label>{pj ? "Razão social" : "Nome"}</label>
          <input value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} required />

          <label>E-mail</label>
          <input type="email" value={email} maxLength={180} onChange={(e) => setEmail(e.target.value)} required />

          {perfil.clienteId && (
            <>
              <label>Telefone</label>
              <PhoneInput international defaultCountry="BR" value={telefone} onChange={(v) => setTelefone(v || "")} />
            </>
          )}

          <button>Salvar alterações</button>
          {msg && <div className={msg.tipo}>{msg.texto}</div>}
        </form>
      </div>

      <div className="card">
        <h2>Trocar senha</h2>
        <form onSubmit={trocarSenha}>
          <label>Senha atual</label>
          <input type="password" value={pw.atual} onChange={(e) => setPw({ ...pw, atual: e.target.value })} required />
          <div className="row">
            <div>
              <label>Nova senha</label>
              <input type="password" value={pw.nova} minLength={8} maxLength={72}
                     onChange={(e) => setPw({ ...pw, nova: e.target.value })} required />
            </div>
            <div>
              <label>Confirmar nova senha</label>
              <input type="password" value={pw.conf} maxLength={72}
                     onChange={(e) => setPw({ ...pw, conf: e.target.value })} required />
            </div>
          </div>
          <div className="muted" style={{ fontSize: "0.78rem", marginTop: 6 }}>
            Mínimo 8 caracteres, com letras e números.
          </div>
          <button>Alterar senha</button>
          {pwMsg && <div className={pwMsg.tipo}>{pwMsg.texto}</div>}
        </form>
      </div>
    </>
  );
}
