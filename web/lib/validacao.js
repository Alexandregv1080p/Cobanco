// Utilitários de validação e máscara — compartilhados por todos os formulários.
// Regra: o backend é a autoridade final (Bean Validation), mas o front valida
// forte e mascara para dar feedback imediato e impedir lixo de sair da tela.

export const MAX_MONEY = 9999999999999.99; // casa com @DecimalMax do backend

export function soDigitos(s) {
  return String(s ?? "").replace(/\D/g, "");
}

// ---------- CPF / CNPJ (dígito verificador) ----------
export function validaCPF(v) {
  const c = soDigitos(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +c[i] * (10 - i);
  let d1 = (s * 10) % 11; if (d1 === 10) d1 = 0;
  if (d1 !== +c[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +c[i] * (11 - i);
  let d2 = (s * 10) % 11; if (d2 === 10) d2 = 0;
  return d2 === +c[10];
}

export function validaCNPJ(v) {
  const c = soDigitos(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (base) => {
    const pesos = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let s = 0;
    for (let i = 0; i < base.length; i++) s += +base[i] * pesos[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  if (calc(c.slice(0, 12)) !== +c[12]) return false;
  return calc(c.slice(0, 13)) === +c[13];
}

export function validaDocumento(tipo, v) {
  return tipo === "JURIDICA" ? validaCNPJ(v) : validaCPF(v);
}

// ---------- Máscaras de documento ----------
export function mascaraCPF(v) {
  const c = soDigitos(v).slice(0, 11);
  return c
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function mascaraCNPJ(v) {
  const c = soDigitos(v).slice(0, 14);
  return c
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function mascaraDocumento(tipo, v) {
  return tipo === "JURIDICA" ? mascaraCNPJ(v) : mascaraCPF(v);
}

// ---------- Dinheiro (acumulador de centavos) ----------
// entrada: string digitada; devolve string mascarada "1.234,56".
export function mascaraMoeda(v) {
  const c = soDigitos(v);
  if (!c) return "";
  const num = Math.min(parseInt(c, 10) / 100, MAX_MONEY);
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// número (reais) -> string mascarada para exibir
export function formataMoeda(n) {
  if (n === "" || n == null || Number.isNaN(Number(n))) return "";
  return Math.min(Number(n), MAX_MONEY).toLocaleString("pt-BR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

// string mascarada "1.234,56" -> número 1234.56
export function parseMoeda(v) {
  const c = soDigitos(v);
  return c ? parseInt(c, 10) / 100 : 0;
}

// ---------- Número de conta (alfanumérico + hífen, maiúsculo) ----------
export function mascaraNumeroConta(v) {
  return String(v ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
}

// ---------- Taxa mensal (fração 0..1) ----------
export function taxaValida(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 1;
}

// ---------- Senha forte ----------
export const SENHA_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
export function senhaForte(v) {
  return SENHA_REGEX.test(String(v ?? ""));
}
