"use client";

import { formataMoeda, parseMoeda } from "../lib/validacao";

/**
 * Input de dinheiro com máscara pt-BR (acumulador de centavos).
 * value: número/ string em reais (ex.: 1234.56); onChange recebe o número (reais).
 */
export default function CampoMoeda({ value, onChange, placeholder = "0,00", disabled, ...rest }) {
  const display = formataMoeda(value);

  function handle(e) {
    onChange(parseMoeda(e.target.value));
  }

  return (
    <div style={{ position: "relative" }}>
      <span style={{
        position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
        color: "var(--faint)", fontSize: "0.9rem", pointerEvents: "none", zIndex: 1,
      }}>R$</span>
      <input
        inputMode="numeric"
        placeholder={placeholder}
        value={display}
        onChange={handle}
        disabled={disabled}
        style={{ paddingLeft: 36 }}
        {...rest}
      />
    </div>
  );
}
