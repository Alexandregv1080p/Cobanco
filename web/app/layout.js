import "./globals.css";
import Nav from "./Nav";

export const metadata = {
  title: "Core Bancário COBOL",
  description: "Núcleo financeiro em COBOL, modernizado numa arquitetura web.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Nav />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
