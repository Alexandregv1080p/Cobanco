"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getUser, logout } from "../lib/auth";

const ITENS = [
  { href: "/", ic: "📊", label: "Painel" },
  { href: "/contas", ic: "🏦", label: "Contas" },
  { href: "/emprestimos", ic: "📉", label: "Empréstimo" },
  { href: "/investimentos", ic: "📈", label: "Investimento" },
  { href: "/perfil", ic: "⚙️", label: "Perfil" },
];

export default function Sidebar() {
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  useEffect(() => { setUser(getUser()); }, [pathname]);

  // Sem barra lateral nas telas de autenticação.
  if (pathname === "/login" || pathname === "/registrar") return null;

  const active = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="sidebar">
      <div className="brand">🏦 Core Bancário</div>
      {ITENS.map((it) => (
        <Link key={it.href} href={it.href} className={active(it.href) ? "active" : ""}>
          <span className="ic">{it.ic}</span> {it.label}
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
