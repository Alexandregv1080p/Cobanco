import "react-phone-number-input/style.css";
import "./globals.css";
import Sidebar from "./Sidebar";

export const metadata = {
  title: "Core Bancário COBOL",
  description: "Núcleo financeiro em COBOL, modernizado numa arquitetura web.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app">
          <Sidebar />
          <main className="content">
            <div className="container">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
