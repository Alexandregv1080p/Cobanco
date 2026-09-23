"use client";

import { useEffect, useMemo, useState } from "react";
import { useRequireAuth, getUser } from "../../lib/auth";
import { validaCPF, mascaraCPF, soDigitos } from "../../lib/validacao";

// ── Pseudo-QR determinístico (SIMULADO — não codifica Pix real) ───────────────
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function FakeQR({ payload, size = 25, px = 8 }) {
  const cells = useMemo(() => {
    let h = hash(payload) || 1;
    const finder = (r, c) => {
      // 3 marcadores de canto 7x7 (com miolo 3x3) como um QR de verdade
      const em = (br, bc, R, C) => R >= br && R < br + 7 && C >= bc && C < bc + 7;
      for (const [br, bc] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
        if (em(br, bc, r, c)) {
          const rr = r - br, cc = c - bc;
          const borda = rr === 0 || rr === 6 || cc === 0 || cc === 6;
          const miolo = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
          return borda || miolo;
        }
      }
      return null;
    };
    const g = [];
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        const f = finder(r, c);
        if (f !== null) { row.push(f); continue; }
        h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
        row.push((h & 1) === 1);
      }
      g.push(row);
    }
    return g;
  }, [payload, size]);

  const W = size * px;
  return (
    <svg width={W} height={W} viewBox={`0 0 ${W} ${W}`} style={{ background: "#fff", borderRadius: 10, padding: 8 }}>
      {cells.map((row, r) => row.map((on, c) => on && (
        <rect key={`${r}-${c}`} x={c * px} y={r * px} width={px} height={px} fill="#0a1f1d" />
      )))}
    </svg>
  );
}

// ── BR Code "copia e cola" (formato plausível, SIMULADO) ──────────────────────
function brCode(chave, valor) {
  const seg = (id, v) => id + String(v.length).padStart(2, "0") + v;
  const mai = seg("00", "BR.GOV.BCB.PIX") + seg("01", chave);
  let payload =
    seg("00", "01") +
    seg("26", mai) +
    seg("52", "0000") + seg("53", "986") +
    (valor > 0 ? seg("54", Number(valor).toFixed(2)) : "") +
    seg("58", "BR") + seg("59", "COBANCO") + seg("60", "SAO PAULO") +
    seg("62", seg("05", "***"));
  return payload + "6304" + (hash(payload) % 65536).toString(16).toUpperCase().padStart(4, "0");
}

const TIPOS = [
  { id: "CPF", label: "CPF" },
  { id: "EMAIL", label: "E-mail" },
  { id: "TELEFONE", label: "Telefone" },
  { id: "ALEATORIA", label: "Aleatória" },
];

export default function PixPage() {
  useRequireAuth();
  const [user, setUser] = useState(null);
  const [chaves, setChaves] = useState([]);
  const [tipo, setTipo] = useState("CPF");
  const [valorChave, setValorChave] = useState("");
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState("");

  // receber
  const [chaveReceber, setChaveReceber] = useState("");
  const [valorReceber, setValorReceber] = useState("");

  const storeKey = user ? `pix_keys_${user.clienteId || "admin"}` : null;

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => {
    if (!storeKey) return;
    try { setChaves(JSON.parse(localStorage.getItem(storeKey) || "[]")); } catch { setChaves([]); }
  }, [storeKey]);

  function persistir(lista) {
    setChaves(lista);
    try { localStorage.setItem(storeKey, JSON.stringify(lista)); } catch { /* ignora */ }
  }

  function adicionar(e) {
    e.preventDefault();
    setErro("");
    let valor = valorChave.trim();
    if (tipo === "ALEATORIA") {
      valor = (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).toLowerCase();
    } else if (tipo === "CPF") {
      if (!validaCPF(valor)) return setErro("CPF inválido");
      valor = soDigitos(valor);
    } else if (tipo === "EMAIL") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return setErro("e-mail inválido");
    } else if (tipo === "TELEFONE") {
      const d = soDigitos(valor);
      if (d.length < 10 || d.length > 13) return setErro("telefone inválido");
      valor = "+55" + d.slice(-11);
    }
    if (chaves.some((c) => c.valor === valor)) return setErro("essa chave já está cadastrada");
    persistir([...chaves, { tipo, valor }]);
    setValorChave("");
  }

  async function copiar(texto, id) {
    try { await navigator.clipboard.writeText(texto); } catch { /* ignora */ }
    setCopiado(id); setTimeout(() => setCopiado(""), 1500);
  }

  const chaveSel = chaveReceber || chaves[0]?.valor || "";
  const codigo = chaveSel ? brCode(chaveSel, valorReceber) : "";

  return (
    <>
      <h1>Área Pix</h1>
      <p className="page-sub">Gerencie suas chaves e receba por Pix. <span className="muted">(ambiente de demonstração)</span></p>

      <div className="pix-grid">
        {/* Minhas chaves */}
        <div className="card">
          <h2>Minhas chaves</h2>
          {chaves.length === 0 ? (
            <p className="muted">Você ainda não tem chaves. Cadastre uma abaixo.</p>
          ) : (
            <div className="pix-chaves">
              {chaves.map((c) => (
                <div key={c.valor} className="pix-chave">
                  <div style={{ minWidth: 0 }}>
                    <div className="pix-chave-tipo">{TIPOS.find((t) => t.id === c.tipo)?.label || c.tipo}</div>
                    <div className="pix-chave-val">{c.tipo === "CPF" ? mascaraCPF(c.valor) : c.valor}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="pix-mini" onClick={() => copiar(c.tipo === "CPF" ? mascaraCPF(c.valor) : c.valor, c.valor)}>
                      {copiado === c.valor ? "Copiado!" : "Copiar"}
                    </button>
                    <button className="pix-mini pix-del" onClick={() => persistir(chaves.filter((x) => x.valor !== c.valor))}>Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={adicionar} style={{ marginTop: 16 }}>
            <label>Cadastrar chave</label>
            <div className="row">
              <select value={tipo} onChange={(e) => { setTipo(e.target.value); setValorChave(""); setErro(""); }}>
                {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              {tipo !== "ALEATORIA" && (
                <input
                  value={valorChave}
                  onChange={(e) => setValorChave(tipo === "CPF" ? mascaraCPF(e.target.value) : e.target.value)}
                  placeholder={tipo === "CPF" ? "000.000.000-00" : tipo === "EMAIL" ? "voce@email.com" : "(11) 99999-9999"}
                  inputMode={tipo === "EMAIL" ? "email" : "text"}
                />
              )}
            </div>
            {tipo === "ALEATORIA" && <div className="muted" style={{ fontSize: "0.8rem", marginTop: 6 }}>Uma chave aleatória será gerada automaticamente.</div>}
            <button style={{ marginTop: 12 }}>Cadastrar chave</button>
            {erro && <div className="erro">{erro}</div>}
          </form>
        </div>

        {/* Receber */}
        <div className="card">
          <h2>Receber via Pix</h2>
          {chaves.length === 0 ? (
            <p className="muted">Cadastre uma chave para gerar seu QR Code de recebimento.</p>
          ) : (
            <>
              <div className="row">
                <div>
                  <label>Chave para receber</label>
                  <select value={chaveSel} onChange={(e) => setChaveReceber(e.target.value)}>
                    {chaves.map((c) => <option key={c.valor} value={c.valor}>{TIPOS.find((t) => t.id === c.tipo)?.label}: {c.tipo === "CPF" ? mascaraCPF(c.valor) : c.valor}</option>)}
                  </select>
                </div>
                <div>
                  <label>Valor (opcional)</label>
                  <input type="number" step="0.01" min="0" value={valorReceber}
                         onChange={(e) => setValorReceber(e.target.value)} placeholder="0,00" />
                </div>
              </div>

              <div className="pix-receber">
                <FakeQR payload={codigo} />
                <div className="muted" style={{ fontSize: "0.78rem", marginTop: 10, textAlign: "center" }}>
                  Aponte a câmera ou use o Pix copia e cola
                </div>
                <div className="pix-copiacola">{codigo}</div>
                <button style={{ width: "100%", marginTop: 10 }} onClick={() => copiar(codigo, "codigo")}>
                  {copiado === "codigo" ? "Código copiado!" : "Copiar código Pix"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .pix-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 22px; align-items: start; }
        @media (max-width: 780px) { .pix-grid { grid-template-columns: 1fr; } }
        .pix-chaves { display: flex; flex-direction: column; gap: 8px; }
        .pix-chave { display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-soft); }
        .pix-chave-tipo { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--faint); font-weight: 700; }
        .pix-chave-val { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pix-mini { margin: 0; padding: 6px 10px; font-size: 0.76rem; background: rgba(255,255,255,0.06);
          color: var(--text); border: 1px solid var(--border); box-shadow: none; border-radius: 8px; }
        .pix-mini:hover { background: rgba(255,255,255,0.12); filter: none; }
        .pix-del { color: var(--neg); }
        .pix-receber { display: flex; flex-direction: column; align-items: center; margin-top: 16px; }
        .pix-copiacola { margin-top: 12px; width: 100%; font-family: ui-monospace, Consolas, monospace;
          font-size: 0.68rem; word-break: break-all; color: var(--muted); background: rgba(0,0,0,0.25);
          border: 1px solid var(--border-soft); border-radius: 10px; padding: 10px 12px; max-height: 84px; overflow: auto; }
      `}</style>
    </>
  );
}
