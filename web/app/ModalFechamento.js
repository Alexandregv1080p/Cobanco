"use client";

import { useEffect, useState } from "react";
import { api, brl } from "../lib/api";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// linhas decorativas do "scanner" (evoca o batch lendo o arquivo sequencial)
const SCAN = [
  "OPEN  CONTAS-SEQ ................ OK",
  "READ  conta #1001-0 ............. OK",
  "CALC  juros cheque especial ..... OK",
  "READ  conta #1002-9 ............. OK",
  "RECON saldo x razao ............. OK",
  "POST  lancamento partidas dobr .. OK",
  "READ  conta #FC-1 (negativa) .... OK",
  "TRAILER control totals .......... OK",
];

/**
 * Modal do fechamento diário: processa (animação) -> sucesso (check) -> recibo.
 * Chama a API internamente; devolve o resultado por onDone(res).
 */
export default function ModalFechamento({ open, onClose, onDone }) {
  const [fase, setFase] = useState("processando"); // processando | ok | erro
  const [res, setRes] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!open) return;
    let vivo = true;
    setFase("processando"); setRes(null); setErro("");
    (async () => {
      try {
        const [r] = await Promise.all([api.fechamento(), sleep(1500)]); // segura a animação
        if (!vivo) return;
        setRes(r); setFase("ok");
        onDone?.(r);
      } catch (e) {
        if (!vivo) return;
        setErro(e.message); setFase("erro");
      }
    })();
    return () => { vivo = false; };
  }, [open]);

  if (!open) return null;

  const comJuros = (res?.linhas || []).filter((l) => Number(l.juros) > 0).length;

  return (
    <div className="mf-overlay" onClick={fase !== "processando" ? onClose : undefined}>
      <div className="mf-box" onClick={(e) => e.stopPropagation()}>
        {fase === "processando" && (
          <>
            <div className="mf-scanner">
              <div className="mf-scroll">
                {[...SCAN, ...SCAN].map((l, i) => <div key={i} className="mf-line">{l}</div>)}
              </div>
              <div className="mf-scanbar" />
            </div>
            <div className="mf-title">Processando fechamento…</div>
            <div className="mf-sub">Núcleo COBOL lendo as contas e reconciliando o razão.</div>
          </>
        )}

        {fase === "ok" && res && (
          <>
            <svg className="mf-check" viewBox="0 0 52 52">
              <circle className="mf-check-c" cx="26" cy="26" r="24" fill="none" />
              <path className="mf-check-p" fill="none" d="M14 27l8 8 16-16" />
            </svg>
            <div className="mf-title">Fechamento concluído</div>
            <div className="mf-sub">Batch COBOL processado e postado no razão.</div>

            <div className="mf-recibo">
              <div className="mf-row"><span>Contas processadas</span><b>{res.contasProcessadas}</b></div>
              <div className="mf-row"><span>Juros de cheque especial</span><b className="mf-neg">{brl(res.totalJuros)}</b></div>
              <div className="mf-row"><span>Contas cobradas</span><b>{comJuros}</b></div>
              <div className="mf-row">
                <span>Reconciliação</span>
                <b className={res.divergencias > 0 ? "mf-neg" : "mf-pos"}>
                  {res.divergencias > 0 ? `${res.divergencias} divergência(s)` : "Tudo OK"}
                </b>
              </div>
              <div className="mf-row"><span>Data/hora</span><b>{new Date().toLocaleString("pt-BR")}</b></div>
            </div>

            <button className="mf-btn" onClick={onClose}>Concluir</button>
          </>
        )}

        {fase === "erro" && (
          <>
            <div className="mf-title" style={{ color: "var(--neg)" }}>Falha no fechamento</div>
            <div className="mf-sub">{erro}</div>
            <button className="mf-btn" onClick={onClose}>Fechar</button>
          </>
        )}
      </div>

      <style>{`
        .mf-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(4, 14, 12, 0.72); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center; padding: 24px;
          animation: mf-fade 0.15s ease;
        }
        @keyframes mf-fade { from { opacity: 0; } to { opacity: 1; } }
        .mf-box {
          background: linear-gradient(170deg, var(--surface-2), var(--surface));
          border: 1px solid var(--border); border-top: 2px solid var(--primary-2);
          border-radius: 20px; padding: 30px 28px 24px; width: 100%; max-width: 420px;
          text-align: center; box-shadow: 0 30px 70px -18px rgba(0,0,0,0.75);
          animation: mf-up 0.2s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes mf-up { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }

        /* scanner do batch */
        .mf-scanner {
          position: relative; height: 132px; overflow: hidden; border-radius: 12px;
          background: rgba(0,0,0,0.35); border: 1px solid var(--border-soft);
          margin-bottom: 20px; text-align: left;
          -webkit-mask-image: linear-gradient(180deg, transparent, #000 22%, #000 78%, transparent);
                  mask-image: linear-gradient(180deg, transparent, #000 22%, #000 78%, transparent);
        }
        .mf-scroll { animation: mf-roll 3s linear infinite; padding: 8px 14px; }
        @keyframes mf-roll { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        .mf-line {
          font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
          font-size: 0.74rem; color: var(--primary-2); line-height: 1.9; white-space: nowrap; opacity: 0.85;
        }
        .mf-scanbar {
          position: absolute; left: 0; right: 0; top: 50%; height: 2px;
          background: linear-gradient(90deg, transparent, var(--primary-2), transparent);
          box-shadow: 0 0 10px var(--primary-2);
        }

        /* check animado */
        .mf-check { width: 76px; height: 76px; margin: 6px auto 4px; display: block; }
        .mf-check-c { stroke: var(--primary-2); stroke-width: 2.5;
          stroke-dasharray: 151; stroke-dashoffset: 151; animation: mf-draw 0.5s ease forwards; }
        .mf-check-p { stroke: var(--primary-2); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round;
          stroke-dasharray: 40; stroke-dashoffset: 40; animation: mf-draw 0.35s 0.4s ease forwards; }
        @keyframes mf-draw { to { stroke-dashoffset: 0; } }

        .mf-title { font-size: 1.25rem; font-weight: 800; color: #eafff9; margin-top: 8px; }
        .mf-sub { color: var(--muted); font-size: 0.86rem; margin-top: 6px; line-height: 1.5; }

        .mf-recibo {
          text-align: left; margin: 20px 0 6px; padding: 14px 16px; border-radius: 12px;
          background: rgba(0,0,0,0.25); border: 1px solid var(--border-soft);
        }
        .mf-row { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.88rem; }
        .mf-row:last-child { border-bottom: none; }
        .mf-row span { color: var(--muted); }
        .mf-row b { color: var(--text); font-variant-numeric: tabular-nums; }
        .mf-neg { color: var(--neg) !important; }
        .mf-pos { color: var(--pos) !important; }

        .mf-btn { width: 100%; margin-top: 16px; }
      `}</style>
    </div>
  );
}
