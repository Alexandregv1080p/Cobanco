"use client";

import { useState } from "react";

// Gera N dígitos determinísticos a partir de uma seed (xorshift) — cartão fake e estável.
function digitos(seed, n) {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  let out = "";
  for (let i = 0; i < n; i++) { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; out += Math.abs(h % 10); }
  return out;
}

/**
 * Cartão virtual (visual, SIMULADO): número/CVV/validade derivados da conta,
 * mascarados por padrão. "Mostrar dados" revela; "Congelar" desativa o cartão.
 */
export default function CartaoVirtual({ seed, titular }) {
  const [mostrar, setMostrar] = useState(false);
  const [congelado, setCongelado] = useState(false);

  const pan = "5" + digitos(seed, 15);                 // 16 dígitos, começa com 5
  const grupos = pan.match(/.{1,4}/g);                 // ["5xxx","xxxx","xxxx","xxxx"]
  const last4 = grupos[3];
  const cvv = digitos(seed + "cvv", 3);
  const mm = String((Math.abs(digitos(seed + "m", 2) % 12)) + 1).padStart(2, "0");
  const yy = String(28 + (Math.abs(digitos(seed + "y", 1) % 4)));  // 28..31
  const nome = (titular || "TITULAR DA CONTA").toUpperCase();

  const numeroExibido = mostrar
    ? grupos.join(" ")
    : `•••• •••• •••• ${last4}`;

  return (
    <div className="cv-wrap">
      <div className={"cv-card" + (congelado ? " cv-frozen" : "")}>
        <div className="cv-top">
          <span className="cv-brand">Cobanco</span>
          <svg className="cv-nfc" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 8a8 8 0 0 1 0 8" /><path d="M9.5 6a12 12 0 0 1 0 12" /><path d="M13 4.5a16 16 0 0 1 0 15" />
          </svg>
        </div>

        {/* chip */}
        <svg className="cv-chip" width="42" height="32" viewBox="0 0 42 32" fill="none">
          <rect x="1" y="1" width="40" height="30" rx="5" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.4)" />
          <path d="M14 1v30M28 1v30M1 11h13M28 11h13M1 21h13M28 21h13" stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" />
        </svg>

        <div className="cv-num">{numeroExibido}</div>

        <div className="cv-bottom">
          <div>
            <div className="cv-lbl">Titular</div>
            <div className="cv-val">{nome}</div>
          </div>
          <div>
            <div className="cv-lbl">Validade</div>
            <div className="cv-val">{mostrar ? `${mm}/${yy}` : "••/••"}</div>
          </div>
          <div>
            <div className="cv-lbl">CVV</div>
            <div className="cv-val">{mostrar ? cvv : "•••"}</div>
          </div>
          {/* marca de bandeira genérica (dois círculos) */}
          <div className="cv-flag" aria-hidden>
            <span style={{ background: "#eb6f2d" }} />
            <span style={{ background: "#f4b93e", marginLeft: -10, mixBlendMode: "screen" }} />
          </div>
        </div>

        {congelado && <div className="cv-frozen-tag">❄ Cartão congelado</div>}
      </div>

      <div className="cv-actions">
        <button type="button" className="cv-btn" onClick={() => setMostrar((v) => !v)} disabled={congelado}>
          {mostrar ? "Ocultar dados" : "Mostrar dados"}
        </button>
        <button type="button" className={"cv-btn" + (congelado ? " cv-on" : "")} onClick={() => setCongelado((v) => !v)}>
          {congelado ? "Descongelar" : "Congelar cartão"}
        </button>
      </div>

      <style>{`
        .cv-wrap { display: flex; flex-direction: column; gap: 12px; }
        .cv-card {
          position: relative; aspect-ratio: 1.586; width: 100%; max-width: 340px;
          border-radius: 16px; padding: 18px 20px; color: #eafffb; overflow: hidden;
          background: linear-gradient(135deg, #0f766e 0%, #0b3b39 55%, #071f1e 100%);
          box-shadow: 0 20px 40px -16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.12);
          display: flex; flex-direction: column;
        }
        .cv-card::after {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(120% 80% at 85% -10%, rgba(45,212,191,0.35), transparent 60%);
        }
        .cv-frozen { filter: grayscale(0.85) brightness(0.8); }
        .cv-frozen-tag {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          font-weight: 800; letter-spacing: 0.03em; color: #dff6ff;
          background: rgba(8,20,24,0.35); backdrop-filter: blur(1px);
        }
        .cv-top { display: flex; align-items: center; justify-content: space-between; }
        .cv-brand { font-weight: 800; letter-spacing: -0.02em; font-size: 1.05rem; }
        .cv-nfc { color: rgba(234,255,251,0.8); }
        .cv-chip { margin: 10px 0 12px; }
        .cv-num {
          font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
          font-size: 1.15rem; letter-spacing: 0.12em; margin-top: auto;
        }
        .cv-bottom { display: flex; align-items: flex-end; gap: 14px; margin-top: 12px; }
        .cv-lbl { font-size: 0.56rem; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.7; }
        .cv-val { font-size: 0.78rem; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .cv-flag { margin-left: auto; display: flex; align-items: center; }
        .cv-flag span { width: 22px; height: 22px; border-radius: 50%; display: block; opacity: 0.92; }

        .cv-actions { display: flex; gap: 10px; max-width: 340px; }
        .cv-btn {
          flex: 1; margin: 0; font-size: 0.82rem; padding: 9px 10px;
          background: rgba(255,255,255,0.06); color: var(--text);
          border: 1px solid var(--border); box-shadow: none; border-radius: 10px;
        }
        .cv-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); filter: none; }
        .cv-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .cv-btn.cv-on { color: var(--primary-2); border-color: var(--primary-2); background: rgba(20,184,166,0.12); }
      `}</style>
    </div>
  );
}
