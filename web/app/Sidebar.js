"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getUser, logout } from "../lib/auth";

const S = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

const icones = {
  painel: (
    <svg {...S}><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>
  ),
  contas: (
    <svg {...S}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><path d="M7 15h4" /></svg>
  ),
  emprestimo: (
    <svg {...S}><path d="M3 7l6 6 4-4 8 8" /><path d="M21 21h-6" /><path d="M21 21v-6" /></svg>
  ),
  investimento: (
    <svg {...S}><path d="M3 17l6-6 4 4 8-8" /><path d="M21 3h-6" /><path d="M21 3v6" /></svg>
  ),
  perfil: (
    <svg {...S}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
  ),
  fechamento: (
    <svg {...S}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
  ),
};

const marca = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10l9-6 9 6" /><path d="M5 10v9" /><path d="M9 10v9" /><path d="M15 10v9" />
    <path d="M19 10v9" /><path d="M3 21h18" />
  </svg>
);

const ITENS = [
  { href: "/", key: "painel", label: "Painel" },
  { href: "/contas", key: "contas", label: "Contas" },
  { href: "/emprestimos", key: "emprestimo", label: "Empréstimo" },
  { href: "/investimentos", key: "investimento", label: "Investimento" },
  { href: "/fechamento", key: "fechamento", label: "Fechamento" },
  { href: "/perfil", key: "perfil", label: "Perfil" },
];

export default function Sidebar() {
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  useEffect(() => { setUser(getUser()); }, [pathname]);

  if (pathname === "/login" || pathname === "/registrar") return null;

  const active = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="sidebar">
      <div className="brand"><span className="ic">{marca}</span> Core Bancário</div>
      {ITENS.map((it) => (
        <Link key={it.href} href={it.href} className={active(it.href) ? "active" : ""}>
          <span className="ic">{icones[it.key]}</span> {it.label}
        </Link>
      ))}
      <div className="spacer" />
      {user && (
        <div className="who">
          <div className="name">{user.nome}</div>
          <div className="role">{user.papel}</div>
          <a className="logout" onClick={(e) => { e.preventDefault(); logout(); }}>Sair</a>
        </div>
      )}
    </aside>
  );
}
