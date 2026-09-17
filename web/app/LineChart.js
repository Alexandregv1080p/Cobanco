"use client";

/**
 * Gráfico de linha em SVG puro (sem biblioteca).
 * pontos: array de números (a série a desenhar).
 */
export default function LineChart({ pontos, cor = "var(--primary-2)", altura = 150 }) {
  const ys = (pontos || []).map(Number).filter((n) => !Number.isNaN(n));
  if (ys.length < 2) return null;

  const W = 640;
  const H = altura;
  const P = 6;
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const range = hi - lo || 1;

  const x = (i) => P + (i / (ys.length - 1)) * (W - 2 * P);
  const y = (v) => H - P - ((v - lo) / range) * (H - 2 * P);

  const linha = ys.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${P},${(H - P).toFixed(1)} ${linha} ${(W - P).toFixed(1)},${(H - P).toFixed(1)}`;
  const zeroDentro = lo < 0 && hi > 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={altura}
         preserveAspectRatio="none" style={{ display: "block" }}>
      <polygon points={area} fill={cor} opacity="0.12" />
      {zeroDentro && (
        <line x1={P} x2={W - P} y1={y(0)} y2={y(0)}
              stroke="var(--faint)" strokeWidth="1" strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke" opacity="0.6" />
      )}
      <polyline points={linha} fill="none" stroke={cor} strokeWidth="2"
                vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
