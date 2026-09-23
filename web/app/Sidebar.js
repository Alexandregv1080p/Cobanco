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
  prova: (
    <svg {...S}><path d="M12 3v18" /><path d="M6 8l-3 6a3 3 0 0 0 6 0z" />
      <path d="M18 8l-3 6a3 3 0 0 0 6 0z" /><path d="M6 8h12" /></svg>
  ),
  credito: (
    <svg {...S}><path d="M22 12A10 10 0 1 1 12 2" /><path d="M12 12l6-4" /><circle cx="12" cy="12" r="1.5" /></svg>
  ),
  contabil: (
    <svg {...S}><path d="M4 4h16v4H4z" /><path d="M6 8v12" /><path d="M12 8v12" /><path d="M18 8v12" /><path d="M4 20h16" /></svg>
  ),
  comparar: (
    <svg {...S}><path d="M3 3v18h18" /><path d="M7 15l4-6 4 3 5-8" /></svg>
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
  { href: "/credito", key: "credito", label: "Crédito" },
  { href: "/investimentos", key: "investimento", label: "Investimento" },
  { href: "/comparar", key: "comparar", label: "Comparar" },
  { href: "/fechamento", key: "fechamento", label: "Fechamento" },
  { href: "/prova", key: "prova", label: "Prova de Exatidão" },
  { href: "/contabil", key: "contabil", label: "Contábil" },
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
      <div className="brand">
        <span className="ic">{marca}</span>
        <div className="brand-txt">
          <span className="brand-name">Cobanco</span>
          <span className="brand-sub">Core bancário · COBOL</span>
        </div>
      </div>
      <div className="demo-chip">Ambiente de demonstração</div>
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
      <div className="secure">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Conexão segura
      </div>
    </aside>
  );
}
