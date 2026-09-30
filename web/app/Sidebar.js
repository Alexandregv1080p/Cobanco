"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  SquaresFour, Wallet, HandCoins, Gauge, TrendUp, ChartBar,
  Moon, Scales, Books, User, Bank, Lock,
} from "@phosphor-icons/react";
import { getUser, logout } from "../lib/auth";

const IC = { size: 18, weight: "regular" };

// Glyph do Pix (marca do BCB — mantido como SVG proposital, não há equivalente em lib)
const PixMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l3.5 3.5-3.5 3.5-3.5-3.5z" /><path d="M12 14l3.5 3.5-3.5 3.5-3.5-3.5z" />
    <path d="M4 11l3.5-3.5L11 11l-3.5 3.5z" /><path d="M13 11l3.5-3.5L20 11l-3.5 3.5z" />
  </svg>
);

const icones = {
  painel: <SquaresFour {...IC} />,
  contas: <Wallet {...IC} />,
  pix: <PixMark />,
  emprestimo: <HandCoins {...IC} />,
  credito: <Gauge {...IC} />,
  investimento: <TrendUp {...IC} />,
  comparar: <ChartBar {...IC} />,
  fechamento: <Moon {...IC} />,
  prova: <Scales {...IC} />,
  contabil: <Books {...IC} />,
  perfil: <User {...IC} />,
};

const ITENS = [
  { href: "/", key: "painel", label: "Painel" },
  { href: "/contas", key: "contas", label: "Contas" },
  { href: "/pix", key: "pix", label: "Pix" },
  { href: "/emprestimos", key: "emprestimo", label: "Empréstimo" },
  { href: "/credito", key: "credito", label: "Crédito" },
  { href: "/investimentos", key: "investimento", label: "Investimento" },
  { href: "/comparar", key: "comparar", label: "Comparar" },
  { href: "/fechamento", key: "fechamento", label: "Fechamento", adminOnly: true },
  { href: "/prova", key: "prova", label: "Prova de Exatidão", adminOnly: true },
  { href: "/contabil", key: "contabil", label: "Contábil", adminOnly: true },
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
        <span className="ic"><Bank size={20} weight="duotone" /></span>
        <div className="brand-txt">
          <span className="brand-name">Cobanco</span>
          <span className="brand-sub">Core bancário · COBOL</span>
        </div>
      </div>
      <div className="demo-chip">Ambiente de demonstração</div>
      {ITENS.filter((it) => !it.adminOnly || user?.papel === "ADMIN").map((it) => (
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
        <Lock size={12} weight="fill" /> Conexão segura
      </div>
    </aside>
  );
}
