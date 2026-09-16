"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getUser, logout } from "../lib/auth";

export default function Nav() {
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  useEffect(() => { setUser(getUser()); }, [pathname]);

  const cls = (href) =>
    pathname === href || (href !== "/" && pathname.startsWith(href)) ? "active" : "";

  // Sem header nas telas de autenticação.
  if (pathname === "/login" || pathname === "/registrar") return null;

  return (
    <nav className="nav">
      <span className="brand">🏦 Core Bancário</span>
      <Link href="/" className={cls("/")}>Contas</Link>
      <Link href="/emprestimos" className={cls("/emprestimos")}>Empréstimo</Link>
      <Link href="/investimentos" className={cls("/investimentos")}>Investimento</Link>
      <span className="muted" style={{ marginLeft: "auto" }}>
        {user ? (
          <>
            Olá, {user.nome}{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Sair</a>
          </>
        ) : (
          <Link href="/login">Entrar</Link>
        )}
      </span>
    </nav>
  );
}
