"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const TOKEN = "cb_token";
const USER = "cb_user";

export function getToken() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(TOKEN); } catch { return null; }
}

export function getUser() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(USER) || "null"); } catch { return null; }
}

export function setSession(auth) {
  localStorage.setItem(TOKEN, auth.token);
  localStorage.setItem(USER, JSON.stringify({
    nome: auth.nome, email: auth.email, papel: auth.papel, clienteId: auth.clienteId,
  }));
}

export function clearSession() {
  try { localStorage.removeItem(TOKEN); localStorage.removeItem(USER); } catch {}
}

export function logout() {
  clearSession();
  window.location.href = "/login";
}

/** Redireciona para /login se não houver sessão. Use no topo das páginas protegidas. */
export function useRequireAuth() {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);
}
