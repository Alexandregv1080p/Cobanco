"use client";

import { useEffect, useState } from "react";
import { api, brl } from "../../lib/api";
import { useRequireAuth } from "../../lib/auth";
import { getUser } from "../../lib/auth";
import ModalFechamento from "../ModalFechamento";

// Ícone "lua" — o batch é a rotina noturna
const IcoLua = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export default function FechamentoPage() {
  useRequireAuth();
  const [admin, setAdmin] = useState(false);
  const [modal, setModal] = useState(false);
  const [res, setRes] = useState(null);
  const [historico, setHistorico] = useState([]); // corridas desta sessão

  useEffect(() => { setAdmin(getUser()?.papel === "ADMIN"); }, []);

  function aoConcluir(r) {
    setRes(r);
    setHistorico((h) => [{ quando: new Date(), ...r }, ...h].slice(0, 10));
  }

  const linhas       = res?.linhas || [];
  const comJuros     = linhas.filter((l) => Number(l.juros) > 0);
  const divergentes  = linhas.filter((l) => l.reconciliacao === "RECON_DIVERGENTE");
  const reconOk      = linhas.length - divergentes.length;

  return (
    <>
      <h1>Central de Fechamento</h1>
      <p className="muted" style={{ maxWidth: 720 }}>
        Rotina batch noturna processada pelo núcleo <strong>COBOL</strong> (<code>FECHAMENTO.COB</code>):
        lê todas as contas como um arquivo sequencial, cobra os <strong>juros de cheque especial</strong> de
        quem está negativo, <strong>reconcilia</strong> o saldo de cada conta contra o razão contábil e
        emite um <strong>trailer</strong> com os totais de controle — o mesmo padrão de mainframe usado em
        fechamentos bancários reais.
      </p>

      {/* Disparo */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span className="fx-ico"><IcoLua /></span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 700, color: "#fff" }}>Fechamento diário</div>
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              Dispara o batch sob demanda (o agendado roda à meia-noite). Cobra juros e posta no razão em partidas dobradas.
            </div>
          </div>
          <button onClick={() => setModal(true)} disabled={!admin} style={{ margin: 0, minWidth: 180 }}>
            Rodar fechamento
          </button>
        </div>
        {!admin && (
          <div className="muted" style={{ marginTop: 12, fontSize: "0.85rem" }}>
            ⚠️ Apenas o perfil <strong>ADMIN</strong> pode disparar o fechamento. Faça login como administrador.
          </div>
        )}
      </div>

      <ModalFechamento open={modal} onClose={() => setModal(false)} onDone={aoConcluir} />

      {res && (
        <>
          {/* Trailer — totais de controle */}
          <div className="stats">
            <div className="stat">
              <div className="k">Contas processadas</div>
              <div className="v">{res.contasProcessadas}</div>
              <div className="s">lidas do arquivo sequencial</div>
            </div>
            <div className="stat">
              <div className="k">Juros de cheque especial</div>
              <div className="v neg">{brl(res.totalJuros)}</div>
              <div className="s">{comJuros.length} conta(s) cobrada(s)</div>
            </div>
            <div className="stat">
              <div className="k">Reconciliação</div>
              <div className={"v " + (res.divergencias > 0 ? "neg" : "pos")}>
                {res.divergencias > 0 ? `${res.divergencias} divergência(s)` : "Tudo OK"}
              </div>
              <div className="s">{reconOk} conta(s) reconciliada(s)</div>
            </div>
          </div>

          {/* Divergências de reconciliação */}
          {divergentes.length > 0 && (
            <div className="card">
              <h2>Divergências de reconciliação <span className="tag" style={{ color: "var(--neg)" }}>atenção</span></h2>
              <p className="muted" style={{ fontSize: "0.86rem" }}>
                Contas cujo saldo não bate com o somatório do razão — investigar antes de encerrar o dia.
              </p>
              <table>
                <thead><tr><th>Conta</th><th>Saldo após batch</th><th>Status</th></tr></thead>
                <tbody>
                  {divergentes.map((l) => (
                    <tr key={l.contaId}>
                      <td>#{l.contaId}</td>
                      <td>{brl(l.novoSaldo)}</td>
                      <td><span className="tag" style={{ color: "var(--neg)" }}>RECON_DIVERGENTE</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Juros cobrados */}
          <div className="card">
            <h2>Juros de cheque especial cobrados</h2>
            {comJuros.length === 0 ? (
              <p className="muted">Nenhuma conta negativa neste fechamento — nada a cobrar.</p>
            ) : (
              <table>
                <thead><tr><th>Conta</th><th>Juros cobrados</th><th>Novo saldo</th></tr></thead>
                <tbody>
                  {comJuros.map((l) => (
                    <tr key={l.contaId}>
                      <td>#{l.contaId}</td>
                      <td style={{ color: "var(--neg)", fontVariantNumeric: "tabular-nums" }}>{brl(l.juros)}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>{brl(l.novoSaldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Histórico da sessão */}
      {historico.length > 0 && (
        <div className="card">
          <h2>Fechamentos desta sessão</h2>
          <table>
            <thead><tr><th>Quando</th><th>Contas</th><th>Total juros</th><th>Divergências</th></tr></thead>
            <tbody>
              {historico.map((h, i) => (
                <tr key={i}>
                  <td>{h.quando.toLocaleString("pt-BR")}</td>
                  <td>{h.contasProcessadas}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{brl(h.totalJuros)}</td>
                  <td style={{ color: h.divergencias > 0 ? "var(--neg)" : "var(--pos)" }}>{h.divergencias}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: "0.78rem", marginTop: 8 }}>
            Histórico apenas desta sessão (em memória). Persistência de corridas fica para uma próxima fase.
          </p>
        </div>
      )}

      <style>{`
        .fx-ico {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(20,184,166,0.14); color: var(--primary-2);
        }
      `}</style>
    </>
  );
}
