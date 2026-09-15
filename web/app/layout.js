import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Core Bancário COBOL",
  description: "Núcleo financeiro em COBOL, modernizado numa arquitetura web.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <nav className="nav">
          <span className="brand">🏦 Core Bancário</span>
          <Link href="/">Contas</Link>
          <Link href="/emprestimos">Simulador de Empréstimo</Link>
          <span className="muted" style={{ marginLeft: "auto" }}>
            núcleo COBOL · API Spring · Postgres
          </span>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
