const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function req(path, options) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.message || `erro ${res.status}`);
  }
  return data;
}

export const api = {
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
};

export function brl(v) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
