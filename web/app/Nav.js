"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUser, logout } from "../lib/auth";

export default function Nav() {
  const [user, setUser] = useState(null);
  useEffect(() => { setUser(getUser()); }, []);

  return (
    <nav className="nav">
      <span className="brand">🏦 Core Bancário</span>
      <Link href="/">Contas</Link>
      <Link href="/emprestimos">Empréstimo</Link>
      <Link href="/investimentos">Investimento</Link>
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
