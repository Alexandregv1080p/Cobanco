"use client";

import { useEffect, useRef } from "react";
import { brl } from "../lib/api";

/**
 * Modal de confirmação genérico para operações financeiras.
 *
 * Props:
 *   open       – boolean
 *   onConfirm  – async fn chamada ao confirmar
 *   onCancel   – fn chamada ao cancelar / fechar
 *   titulo     – string, ex: "Confirmar Depósito"
 *   cor        – "ok" | "alerta" | "perigo"  (borda/ícone da operação)
 *   icon       – emoji/ícone exibido no topo
 *   linhas     – array de { label, valor } para o resumo
 *   loading    – boolean (enquanto aguarda resposta da API)
 */
export default function ConfirmModal({
  open,
  onConfirm,
  onCancel,
  titulo = "Confirmar operação",
  cor = "ok",
  icon = "💳",
  linhas = [],
  loading = false,
}) {
  const confirmRef = useRef(null);

  /* foca o botão de confirmação ao abrir */
  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  /* fecha com Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={`modal-box modal-${cor}`} role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <div className="modal-icon">{icon}</div>
        <h2 id="modal-titulo">{titulo}</h2>

        <dl className="modal-resumo">
          {linhas.map(({ label, valor }) => (
            <div key={label} className="modal-linha">
              <dt>{label}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>

        <p className="modal-aviso">Deseja confirmar esta operação? A ação não pode ser desfeita.</p>

        <div className="modal-acoes">
          <button className="btn-cancelar" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button
            className={`btn-confirmar btn-${cor}`}
            onClick={onConfirm}
            disabled={loading}
            ref={confirmRef}
          >
            {loading ? <span className="spinner" aria-label="Aguardando…" /> : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
