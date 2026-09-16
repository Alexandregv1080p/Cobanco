import { getToken, clearSession } from "./auth";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function req(path, options = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
  });

  // Sessão expirada em endpoint protegido -> volta pro login (menos /auth/*).
  if (res.status === 401 && !path.startsWith("/auth")) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("sessão expirada");
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.message || `erro ${res.status}`);
  }
  return data;
}

export const api = {
  registrar: (body) => req("/auth/registrar", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => req("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  listarContas: () => req("/contas"),
  criarCliente: (body) => req("/clientes", { method: "POST", body: JSON.stringify(body) }),
  criarConta: (body) => req("/contas", { method: "POST", body: JSON.stringify(body) }),
  conta: (id) => req(`/contas/${id}`),
  extrato: (id) => req(`/contas/${id}/extrato`),
  deposito: (id, valor) => req(`/contas/${id}/deposito`, { method: "POST", body: JSON.stringify({ valor }) }),
  saque: (id, valor) => req(`/contas/${id}/saque`, { method: "POST", body: JSON.stringify({ valor }) }),
  transferencia: (id, contaDestinoId, valor) =>
    req(`/contas/${id}/transferencia`, { method: "POST", body: JSON.stringify({ contaDestinoId, valor }) }),
  simular: (body) => req("/emprestimos/simular", { method: "POST", body: JSON.stringify(body) }),
  simularInvestimento: (body) => req("/investimentos/simular", { method: "POST", body: JSON.stringify(body) }),
  razao: (id) => req(`/contas/${id}/razao`),
  balancete: () => req("/razao/balancete"),
  fechamento: () => req("/batch/fechamento-diario", { method: "POST" }),
};

export function brl(v) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
